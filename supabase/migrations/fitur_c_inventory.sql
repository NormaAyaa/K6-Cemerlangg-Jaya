-- =============================================================
-- Fitur C: Inventory dan Pengguna
-- 1. catat_stok_masuk (Admin, Owner) - PRD 9.2
-- 2. sesuaikan_stok (Owner) - PRD 9.2
-- 3. Bucket publik & RLS policy storage - PRD Bab 11
-- =============================================================

-- ---------- 1. Fungsi catat_stok_masuk ----------
create or replace function public.catat_stok_masuk(
  p_item uuid,
  p_jumlah int,
  p_keterangan text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_jenis text;
  v_stok int;
begin
  -- 1. Pemeriksaan peran di awal
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh mencatat stok masuk';
  end if;

  -- 2. Validasi input
  if p_jumlah is null or p_jumlah < 1 then
    raise exception 'Jumlah stok masuk minimal 1';
  end if;

  -- 3. Kunci baris item dengan FOR UPDATE dan validasi jenis item
  select jenis, stok into v_jenis, v_stok
  from public.inventory_items
  where id = p_item
  for update;

  if not found then
    raise exception 'Item inventory tidak ditemukan';
  end if;

  if v_jenis <> 'part' then
    raise exception 'Hanya spare part yang dapat ditambah stoknya';
  end if;

  -- 4. Tambah stok item
  update public.inventory_items
  set stok = stok + p_jumlah
  where id = p_item;

  -- 5. Catat pergerakan di stock_movements
  insert into public.stock_movements (
    item_id,
    jenis,
    jumlah,
    stok_sesudah,
    keterangan,
    dicatat_oleh
  ) values (
    p_item,
    'masuk',
    p_jumlah,
    v_stok + p_jumlah,
    p_keterangan,
    auth.uid()
  );
end;
$$;

revoke execute on function public.catat_stok_masuk(uuid, int, text) from public, anon;
grant execute on function public.catat_stok_masuk(uuid, int, text) to authenticated;


-- ---------- 2. Fungsi sesuaikan_stok ----------
create or replace function public.sesuaikan_stok(
  p_item uuid,
  p_stok_fisik int,
  p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_jenis text;
  v_stok int;
  v_selisih int;
begin
  -- 1. Pemeriksaan peran di awal (hanya Owner)
  v_peran := private.peran_saya();
  if v_peran <> 'owner' then
    raise exception 'Hanya Owner yang boleh menyesuaikan stok fisik';
  end if;

  -- 2. Validasi input
  if p_stok_fisik is null or p_stok_fisik < 0 then
    raise exception 'Stok fisik tidak boleh negatif';
  end if;

  if p_alasan is null or trim(p_alasan) = '' then
    raise exception 'Alasan penyesuaian stok wajib diisi';
  end if;

  -- 3. Kunci baris item dengan FOR UPDATE
  select jenis, stok into v_jenis, v_stok
  from public.inventory_items
  where id = p_item
  for update;

  if not found then
    raise exception 'Item inventory tidak ditemukan';
  end if;

  if v_jenis <> 'part' then
    raise exception 'Hanya spare part yang memiliki stok fisik';
  end if;

  -- 4. Hitung selisih fisik vs sistem
  v_selisih := p_stok_fisik - v_stok;

  -- 5. Perbarui stok item
  update public.inventory_items
  set stok = p_stok_fisik
  where id = p_item;

  -- 6. Catat pergerakan penyesuaian di stock_movements
  insert into public.stock_movements (
    item_id,
    jenis,
    jumlah,
    stok_sesudah,
    keterangan,
    dicatat_oleh
  ) values (
    p_item,
    'penyesuaian',
    v_selisih,
    p_stok_fisik,
    trim(p_alasan),
    auth.uid()
  );
end;
$$;

revoke execute on function public.sesuaikan_stok(uuid, int, text) from public, anon;
grant execute on function public.sesuaikan_stok(uuid, int, text) to authenticated;


-- ---------- 3. Storage Bucket publik & Kebijakan RLS ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'publik',
  'publik',
  true,
  1048576,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS Policy: Unduh/baca publik (siapa pun)
drop policy if exists "publik_unduh" on storage.objects;
create policy "publik_unduh"
on storage.objects for select
to public
using (bucket_id = 'publik');

-- RLS Policy: Unggah logo/galeri hanya Owner
drop policy if exists "publik_unggah_owner" on storage.objects;
create policy "publik_unggah_owner"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'publik' and (select private.peran_saya()) = 'owner'
);

-- RLS Policy: Ubah file hanya Owner
drop policy if exists "publik_ubah_owner" on storage.objects;
create policy "publik_ubah_owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'publik' and (select private.peran_saya()) = 'owner'
)
with check (
  bucket_id = 'publik' and (select private.peran_saya()) = 'owner'
);

-- RLS Policy: Hapus file hanya Owner
drop policy if exists "publik_hapus_owner" on storage.objects;
create policy "publik_hapus_owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'publik' and (select private.peran_saya()) = 'owner'
);
