-- ============================================================================
-- Fitur A: Work Order
-- Sesuai PRD 9.2, 7.2, 9.4, dan Bab 11
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fungsi buat_work_order (PRD 9.2 & 6.7)
-- ----------------------------------------------------------------------------
create or replace function public.buat_work_order(
  p_vehicle_id uuid,
  p_kepala_mekanik_id uuid,
  p_odometer int,
  p_keluhan text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_customer_id uuid;
  v_periode text;
  v_nomor_urut int;
  v_nomor text;
  v_wo_id uuid;
begin
  -- 1. Periksa peran pemanggil di awal (hanya Admin atau Owner)
  v_peran := private.peran_saya();
  if v_peran is null or v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh membuat Work Order';
  end if;

  -- 2. Validasi parameter input
  if p_odometer is null or p_odometer < 0 then
    raise exception 'Odometer wajib diisi dan tidak boleh bernilai negatif';
  end if;

  if p_keluhan is null or trim(p_keluhan) = '' then
    raise exception 'Keluhan wajib diisi';
  end if;

  -- 3. Periksa keberadaan kendaraan dan ambil customer_id
  select customer_id into v_customer_id
  from public.vehicles
  where id = p_vehicle_id;

  if v_customer_id is null then
    raise exception 'Kendaraan tidak ditemukan';
  end if;

  -- 4. Validasi Kepala Mekanik (harus aktif dan ber-role kepala_mekanik)
  if not exists (
    select 1 from public.profiles
    where id = p_kepala_mekanik_id
      and role = 'kepala_mekanik'
      and aktif = true
  ) then
    raise exception 'Kepala Mekanik tidak valid atau akun tidak aktif';
  end if;

  -- 5. Penomoran otomatis unik (WO-YYMM-0001) via number_counters
  v_periode := to_char(now(), 'YYMM');
  v_nomor_urut := private.nomor_berikut('WO', v_periode);
  v_nomor := 'WO-' || v_periode || '-' || lpad(v_nomor_urut::text, 4, '0');

  -- 6. Simpan baris Work Order baru
  insert into public.work_orders (
    nomor,
    vehicle_id,
    customer_id,
    kepala_mekanik_id,
    odometer,
    keluhan,
    status,
    dibuat_oleh
  ) values (
    v_nomor,
    p_vehicle_id,
    v_customer_id,
    p_kepala_mekanik_id,
    p_odometer,
    trim(p_keluhan),
    'menunggu',
    auth.uid()
  )
  returning id into v_wo_id;

  -- 7. Catat riwayat status pertama ke wo_status_history
  insert into public.wo_status_history (
    work_order_id,
    dari_status,
    ke_status,
    catatan,
    oleh
  ) values (
    v_wo_id,
    null,
    'menunggu',
    'Work Order dibuat',
    auth.uid()
  );

  return v_wo_id;
end;
$$;

revoke all on function public.buat_work_order(uuid, uuid, int, text) from public, anon;
grant execute on function public.buat_work_order(uuid, uuid, int, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 2. Fungsi tugaskan_mekanik (PRD 9.2 & 6.8)
-- ----------------------------------------------------------------------------
create or replace function public.tugaskan_mekanik(
  p_wo uuid,
  p_mekanik uuid[],
  p_estimasi date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_kepala_mekanik_id uuid;
  v_status text;
  v_jumlah_mekanik int;
  v_mekanik_valid int;
begin
  -- 1. Periksa peran pemanggil di awal (Owner atau Kepala Mekanik)
  v_peran := private.peran_saya();
  if v_peran is null or v_peran not in ('owner', 'kepala_mekanik') then
    raise exception 'Hanya Kepala Mekanik atau Owner yang boleh menugaskan mekanik';
  end if;

  -- 2. Kunci baris WO dengan for update untuk mencegah perebutan
  select kepala_mekanik_id, status
  into v_kepala_mekanik_id, v_status
  from public.work_orders
  where id = p_wo
  for update;

  if v_status is null then
    raise exception 'Work Order tidak ditemukan';
  end if;

  -- 3. Periksa relasi tim (Kepala Mekanik hanya timnya sendiri, Owner bebas)
  if v_peran = 'kepala_mekanik' and v_kepala_mekanik_id <> auth.uid() then
    raise exception 'Hanya Kepala Mekanik tim yang menangani WO ini atau Owner yang boleh menugaskan mekanik';
  end if;

  -- 4. Status WO harus 'menunggu'
  if v_status <> 'menunggu' then
    raise exception 'Penugasan mekanik hanya dapat dilakukan saat status WO masih menunggu';
  end if;

  -- 5. Validasi tanggal estimasi (wajib diisi dan tidak boleh sebelum hari ini)
  if p_estimasi is null or p_estimasi < current_date then
    raise exception 'Tanggal estimasi selesai tidak boleh kosong atau sebelum hari ini';
  end if;

  -- 6. Validasi mekanik: 1 s.d. 3 mekanik
  if p_mekanik is null or cardinality(p_mekanik) = 0 then
    raise exception 'Minimal 1 mekanik harus dipilih';
  end if;

  if cardinality(p_mekanik) > 3 then
    raise exception 'Maksimal 3 mekanik yang boleh ditugaskan';
  end if;

  -- Pastikan tidak ada mekanik duplikat di dalam array
  select count(distinct m) into v_jumlah_mekanik from unnest(p_mekanik) m;
  if v_jumlah_mekanik <> cardinality(p_mekanik) then
    raise exception 'Daftar mekanik yang dipilih tidak boleh duplikat';
  end if;

  -- Pastikan semua mekanik aktif dan berada di tim Kepala Mekanik yang bersangkutan
  select count(*) into v_mekanik_valid
  from public.mekanik
  where id = any(p_mekanik)
    and kepala_mekanik_id = v_kepala_mekanik_id
    and aktif = true;

  if v_mekanik_valid <> v_jumlah_mekanik then
    raise exception 'Semua mekanik yang ditugaskan harus aktif dan tergabung dalam tim yang menangani WO ini';
  end if;

  -- 7. Simpan estimasi selesai pada WO
  update public.work_orders
  set estimasi_selesai = p_estimasi
  where id = p_wo;

  -- 8. Simpan daftar mekanik ke tabel work_order_mekanik
  delete from public.work_order_mekanik where work_order_id = p_wo;

  insert into public.work_order_mekanik (work_order_id, mekanik_id)
  select p_wo, unnest(p_mekanik);
end;
$$;

revoke all on function public.tugaskan_mekanik(uuid, uuid[], date) from public, anon;
grant execute on function public.tugaskan_mekanik(uuid, uuid[], date) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Fungsi ubah_status_wo (PRD 9.2 & 7.2)
-- ----------------------------------------------------------------------------
create or replace function public.ubah_status_wo(
  p_wo uuid,
  p_status text,
  p_catatan text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_status_lama text;
  v_kepala_mekanik_id uuid;
  v_estimasi_selesai date;
  v_is_owner boolean;
  v_is_admin boolean;
  v_is_km_tim boolean;
  v_status_bayar text;
  r_part record;
  v_stok_baru int;
begin
  -- 1. Periksa peran pemanggil di awal
  v_peran := private.peran_saya();
  if v_peran is null then
    raise exception 'Pengguna tidak memiliki akses atau akun tidak aktif';
  end if;

  -- 2. Kunci baris WO dengan for update
  select status, kepala_mekanik_id, estimasi_selesai
  into v_status_lama, v_kepala_mekanik_id, v_estimasi_selesai
  from public.work_orders
  where id = p_wo
  for update;

  if v_status_lama is null then
    raise exception 'Work Order tidak ditemukan';
  end if;

  v_is_owner := (v_peran = 'owner');
  v_is_admin := (v_peran = 'admin');
  v_is_km_tim := (v_peran = 'kepala_mekanik' and v_kepala_mekanik_id = auth.uid());

  -- 3. Validasi nilai status tujuan
  if p_status not in ('menunggu', 'dikerjakan', 'tertunda', 'selesai', 'siap_diambil', 'diambil', 'dibatalkan') then
    raise exception 'Status Work Order tidak valid: %', p_status;
  end if;

  if v_status_lama = p_status then
    return;
  end if;

  -- 4. Validasi aturan perpindahan status sesuai PRD 7.2
  -- A. menunggu -> dikerjakan
  if v_status_lama = 'menunggu' and p_status = 'dikerjakan' then
    if not (v_is_owner or v_is_km_tim) then
      raise exception 'Hanya Kepala Mekanik tim WO ini atau Owner yang boleh memulai pengerjaan';
    end if;
    if v_estimasi_selesai is null then
      raise exception 'Estimasi tanggal selesai wajib diisi sebelum pengerjaan dimulai';
    end if;
    if not exists (select 1 from public.work_order_mekanik where work_order_id = p_wo) then
      raise exception 'Minimal 1 mekanik harus ditugaskan sebelum pengerjaan dimulai';
    end if;

  -- B. dikerjakan -> tertunda
  elsif v_status_lama = 'dikerjakan' and p_status = 'tertunda' then
    if not (v_is_owner or v_is_km_tim) then
      raise exception 'Hanya Kepala Mekanik tim WO ini atau Owner yang boleh menunda pengerjaan';
    end if;
    if p_catatan is null or trim(p_catatan) = '' then
      raise exception 'Catatan alasan penundaan wajib diisi';
    end if;

  -- C. tertunda -> dikerjakan
  elsif v_status_lama = 'tertunda' and p_status = 'dikerjakan' then
    if not (v_is_owner or v_is_km_tim) then
      raise exception 'Hanya Kepala Mekanik tim WO ini atau Owner yang boleh melanjutkan pengerjaan';
    end if;

  -- D. dikerjakan -> selesai
  elsif v_status_lama = 'dikerjakan' and p_status = 'selesai' then
    if not (v_is_owner or v_is_km_tim) then
      raise exception 'Hanya Kepala Mekanik tim WO ini atau Owner yang boleh menyelesaikan pengerjaan';
    end if;
    if not exists (select 1 from public.billing_items where work_order_id = p_wo) then
      raise exception 'Catat minimal 1 jasa atau spare part sebelum menyelesaikan pengerjaan';
    end if;

  -- E. selesai -> siap_diambil (QC Lulus)
  elsif v_status_lama = 'selesai' and p_status = 'siap_diambil' then
    if not (v_is_owner or v_is_km_tim) then
      raise exception 'Hanya Kepala Mekanik tim WO ini atau Owner yang boleh memverifikasi hasil kerja (QC)';
    end if;

  -- F. selesai -> dikerjakan (QC Gagal)
  elsif v_status_lama = 'selesai' and p_status = 'dikerjakan' then
    if not (v_is_owner or v_is_km_tim) then
      raise exception 'Hanya Kepala Mekanik tim WO ini atau Owner yang boleh memverifikasi hasil kerja (QC)';
    end if;
    if p_catatan is null or trim(p_catatan) = '' then
      raise exception 'Catatan perbaikan wajib diisi jika hasil QC gagal';
    end if;

  -- G. siap_diambil -> diambil
  elsif v_status_lama = 'siap_diambil' and p_status = 'diambil' then
    if not (v_is_owner or v_is_admin) then
      raise exception 'Hanya Admin atau Owner yang boleh menyerahkan kendaraan';
    end if;

    select status_bayar into v_status_bayar
    from public.invoices
    where work_order_id = p_wo;

    if v_status_bayar is null or v_status_bayar <> 'lunas' then
      raise exception 'Kendaraan hanya boleh diserahkan setelah invoice terbit dan berstatus lunas';
    end if;

    if not exists (
      select 1 from public.work_order_photos
      where work_order_id = p_wo and jenis = 'kondisi_akhir'
    ) then
      raise exception 'Minimal 1 foto kondisi akhir harus diunggah sebelum menyerahkan kendaraan';
    end if;

  -- H. menunggu, dikerjakan, tertunda -> dibatalkan
  elsif v_status_lama in ('menunggu', 'dikerjakan', 'tertunda') and p_status = 'dibatalkan' then
    if not (v_is_owner or v_is_admin) then
      raise exception 'Hanya Admin atau Owner yang boleh membatalkan Work Order';
    end if;
    if p_catatan is null or trim(p_catatan) = '' then
      raise exception 'Alasan pembatalan Work Order wajib diisi';
    end if;

    -- Kembalikan semua stok spare part yang tercatat di tagihan
    for r_part in (
      select b.item_id, b.jumlah, b.nama_item
      from public.billing_items b
      where b.work_order_id = p_wo and b.jenis = 'part'
    ) loop
      update public.inventory_items
      set stok = stok + r_part.jumlah
      where id = r_part.item_id
      returning stok into v_stok_baru;

      insert into public.stock_movements (
        item_id,
        jenis,
        jumlah,
        stok_sesudah,
        keterangan,
        work_order_id,
        dicatat_oleh
      ) values (
        r_part.item_id,
        'kembali',
        r_part.jumlah,
        v_stok_baru,
        'Pengembalian stok pembatalan WO: ' || trim(p_catatan),
        p_wo,
        auth.uid()
      );
    end loop;

  else
    raise exception 'Perpindahan status dari % ke % tidak diizinkan', v_status_lama, p_status;
  end if;

  -- 5. Perbarui status Work Order
  update public.work_orders
  set status = p_status,
      catatan_status = coalesce(trim(p_catatan), catatan_status),
      selesai_at = case when p_status = 'selesai' then coalesce(selesai_at, now()) else selesai_at end,
      diambil_at = case when p_status = 'diambil' then coalesce(diambil_at, now()) else diambil_at end
  where id = p_wo;

  -- 6. Catat perubahan ke wo_status_history
  insert into public.wo_status_history (
    work_order_id,
    dari_status,
    ke_status,
    catatan,
    oleh
  ) values (
    p_wo,
    v_status_lama,
    p_status,
    trim(p_catatan),
    auth.uid()
  );
end;
$$;

revoke all on function public.ubah_status_wo(uuid, text, text) from public, anon;
grant execute on function public.ubah_status_wo(uuid, text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 4. Trigger jaga_wo (PRD 9.4 & 10.2)
-- ----------------------------------------------------------------------------
create or replace function private.jaga_wo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_peran text;
begin
  -- Hanya periksa jika update dipanggil langsung oleh client (authenticated)
  if current_user = 'authenticated' then
    v_peran := private.peran_saya();

    -- Status WO tidak boleh diubah langsung
    if new.status is distinct from old.status then
      raise exception 'Status Work Order hanya boleh diubah melalui fungsi resmi (ubah_status_wo)';
    end if;

    -- Kolom lain yang dikunci dari update langsung
    if new.nomor is distinct from old.nomor or
       new.vehicle_id is distinct from old.vehicle_id or
       new.customer_id is distinct from old.customer_id or
       new.dibuat_oleh is distinct from old.dibuat_oleh or
       new.selesai_at is distinct from old.selesai_at or
       new.diambil_at is distinct from old.diambil_at or
       new.diskon is distinct from old.diskon or
       new.alasan_diskon is distinct from old.alasan_diskon or
       new.estimasi_selesai is distinct from old.estimasi_selesai or
       new.catatan_status is distinct from old.catatan_status then
      raise exception 'Kolom Work Order ini tidak boleh diubah secara langsung';
    end if;

    -- Perubahan keluhan, odometer, kepala_mekanik_id:
    -- Hanya oleh Admin atau Owner saat status 'menunggu'
    if (new.keluhan is distinct from old.keluhan or
        new.odometer is distinct from old.odometer or
        new.kepala_mekanik_id is distinct from old.kepala_mekanik_id) then
      if old.status <> 'menunggu' then
        raise exception 'Keluhan, odometer, dan tim hanya boleh diubah saat status WO masih menunggu';
      end if;
      if v_peran not in ('admin', 'owner') then
        raise exception 'Hanya Admin atau Owner yang boleh mengubah data masuk saat status menunggu';
      end if;
    end if;

    -- Perubahan diagnosis:
    -- Hanya oleh Kepala Mekanik tim WO atau Owner saat status 'dikerjakan' atau 'tertunda'
    if new.diagnosis is distinct from old.diagnosis then
      if old.status not in ('dikerjakan', 'tertunda') then
        raise exception 'Diagnosis hanya boleh diisi saat WO berstatus dikerjakan atau tertunda';
      end if;
      if not (v_peran = 'owner' or (v_peran = 'kepala_mekanik' and old.kepala_mekanik_id = auth.uid())) then
        raise exception 'Hanya Kepala Mekanik tim WO ini atau Owner yang boleh mengisi diagnosis';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists jaga_wo on public.work_orders;
create trigger jaga_wo
before update on public.work_orders
for each row execute function private.jaga_wo();


-- ----------------------------------------------------------------------------
-- 5. Storage Bucket foto-wo dan Policy RLS (PRD Bab 11)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foto-wo',
  'foto-wo',
  false,
  1048576,
  array['image/webp', 'image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/webp', 'image/jpeg'];

drop policy if exists "foto_wo_lihat" on storage.objects;
drop policy if exists "foto_wo_unggah_awal" on storage.objects;
drop policy if exists "foto_wo_unggah_akhir" on storage.objects;
drop policy if exists "foto_wo_unggah_pengerjaan" on storage.objects;
drop policy if exists "foto_wo_hapus" on storage.objects;

-- 1. Lihat (select): Semua pengguna login yang aktif
create policy "foto_wo_lihat"
on storage.objects for select to authenticated
using (
  bucket_id = 'foto-wo'
  and (select private.peran_saya()) is not null
);

-- 2. Unggah stnk & kondisi_awal: Admin dan Owner saat WO 'menunggu'
create policy "foto_wo_unggah_awal"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'foto-wo'
  and (select private.peran_saya()) in ('admin', 'owner')
  and (storage.foldername(name))[2] in ('stnk', 'kondisi_awal')
  and exists (
    select 1 from public.work_orders w
    where w.id::text = (storage.foldername(name))[1]
      and w.status = 'menunggu'
  )
);

-- 3. Unggah kondisi_akhir: Admin dan Owner saat WO 'siap_diambil'
create policy "foto_wo_unggah_akhir"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'foto-wo'
  and (select private.peran_saya()) in ('admin', 'owner')
  and (storage.foldername(name))[2] = 'kondisi_akhir'
  and exists (
    select 1 from public.work_orders w
    where w.id::text = (storage.foldername(name))[1]
      and w.status = 'siap_diambil'
  )
);

-- 4. Unggah foto pengerjaan: Kepala Mekanik tim WO saat 'dikerjakan', atau Owner
create policy "foto_wo_unggah_pengerjaan"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'foto-wo'
  and (
    (select private.peran_saya()) = 'owner'
    or (
      (select private.peran_saya()) = 'kepala_mekanik'
      and exists (
        select 1 from public.work_orders w
        where w.id::text = (storage.foldername(name))[1]
          and w.kepala_mekanik_id = (select auth.uid())
          and w.status = 'dikerjakan'
      )
    )
  )
  and (storage.foldername(name))[2] = 'pengerjaan'
);

-- 5. Hapus foto: Hanya Owner
create policy "foto_wo_hapus"
on storage.objects for delete to authenticated
using (
  bucket_id = 'foto-wo'
  and (select private.peran_saya()) = 'owner'
);
