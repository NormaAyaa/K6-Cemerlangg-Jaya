-- ============================================================================
-- App 4 Cemerlang Jaya Motor · Migrasi Fitur B: Tagihan dan Invoice
-- Sesuai PRD Bab 9.2, 8.2, dan 6.8
-- ============================================================================

-- 1. tambah_item_tagihan
create or replace function public.tambah_item_tagihan(
  p_wo uuid,
  p_item uuid,
  p_jumlah int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_wo_status text;
  v_kepala_id uuid;
  v_wo_nomor text;
  v_item record;
  v_modal bigint;
  v_stok_baru int;
  v_billing_id uuid;
begin
  -- 1. Periksa sesi dan peran
  v_peran := private.peran_saya();
  if v_peran is null then
    raise exception 'Akses ditolak: sesi tidak valid atau akun dinonaktifkan';
  end if;

  -- 2. Ambil data WO dan periksa hak akses serta status WO
  select status, kepala_mekanik_id, nomor
  into v_wo_status, v_kepala_id, v_wo_nomor
  from public.work_orders
  where id = p_wo;

  if not found then
    raise exception 'Work Order tidak ditemukan';
  end if;

  if v_peran = 'kepala_mekanik' and v_kepala_id <> auth.uid() then
    raise exception 'Hanya Kepala Mekanik tim yang menangani WO ini atau Owner yang boleh menambah item tagihan';
  end if;

  if v_peran not in ('owner', 'kepala_mekanik') then
    raise exception 'Hanya Kepala Mekanik atau Owner yang berhak menambah item tagihan';
  end if;

  if v_wo_status <> 'dikerjakan' then
    raise exception 'Item tagihan hanya dapat ditambahkan saat WO berstatus dikerjakan (status saat ini: %)', v_wo_status;
  end if;

  if p_jumlah is null or p_jumlah < 1 then
    raise exception 'Jumlah item harus minimal 1';
  end if;

  -- 3. Kunci baris inventory_items dengan FOR UPDATE untuk mencegah race condition
  select id, kode, jenis, nama, harga_jual, stok, aktif
  into v_item
  from public.inventory_items
  where id = p_item
  for update;

  if not found then
    raise exception 'Item inventory tidak ditemukan';
  end if;

  if not v_item.aktif then
    raise exception 'Item % sedang nonaktif', v_item.nama;
  end if;

  -- 4. Jika spare part, periksa stok dan kurangi
  if v_item.jenis = 'part' then
    if v_item.stok < p_jumlah then
      raise exception 'Stok % hanya %', v_item.nama, v_item.stok;
    end if;

    v_stok_baru := v_item.stok - p_jumlah;

    update public.inventory_items
    set stok = v_stok_baru,
        updated_at = now()
    where id = v_item.id;

    -- Catat stock movements (keluar, jumlah negatif sesuai PRD 8.2)
    insert into public.stock_movements (
      item_id,
      jenis,
      jumlah,
      stok_sesudah,
      keterangan,
      work_order_id,
      dicatat_oleh
    ) values (
      v_item.id,
      'keluar',
      -p_jumlah,
      v_stok_baru,
      'Pemakaian di ' || v_wo_nomor,
      p_wo,
      auth.uid()
    );
  end if;

  -- 5. Ambil harga modal saat ini (jasa = 0)
  if v_item.jenis = 'part' then
    select coalesce(harga_modal, 0)
    into v_modal
    from public.inventory_costs
    where item_id = v_item.id;

    if not found then
      v_modal := 0;
    end if;
  else
    v_modal := 0;
  end if;

  -- 6. Buat baris billing_items
  insert into public.billing_items (
    work_order_id,
    item_id,
    nama_item,
    jenis,
    jumlah,
    harga_master,
    harga_dipakai,
    ditambah_oleh
  ) values (
    p_wo,
    v_item.id,
    v_item.nama,
    v_item.jenis,
    p_jumlah,
    v_item.harga_jual,
    v_item.harga_jual,
    auth.uid()
  )
  returning id into v_billing_id;

  -- 7. Simpan harga modal ke billing_item_costs
  insert into public.billing_item_costs (
    billing_item_id,
    harga_modal
  ) values (
    v_billing_id,
    v_modal
  );

  return v_billing_id;
end;
$$;


-- 2. hapus_item_tagihan
create or replace function public.hapus_item_tagihan(
  p_billing_item uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_billing record;
  v_wo record;
  v_stok_sekarang int;
  v_stok_baru int;
begin
  -- 1. Periksa sesi dan peran
  v_peran := private.peran_saya();
  if v_peran is null then
    raise exception 'Akses ditolak: sesi tidak valid atau akun dinonaktifkan';
  end if;

  -- 2. Cari billing item
  select id, work_order_id, item_id, jenis, jumlah
  into v_billing
  from public.billing_items
  where id = p_billing_item;

  if not found then
    raise exception 'Item tagihan tidak ditemukan';
  end if;

  -- 3. Cari WO dan periksa hak akses serta status
  select status, kepala_mekanik_id, nomor
  into v_wo
  from public.work_orders
  where id = v_billing.work_order_id;

  if not found then
    raise exception 'Work Order tidak ditemukan';
  end if;

  if v_peran = 'kepala_mekanik' and v_wo.kepala_mekanik_id <> auth.uid() then
    raise exception 'Hanya Kepala Mekanik tim yang menangani WO ini atau Owner yang boleh menghapus item tagihan';
  end if;

  if v_peran not in ('owner', 'kepala_mekanik') then
    raise exception 'Hanya Kepala Mekanik atau Owner yang berhak menghapus item tagihan';
  end if;

  if v_wo.status <> 'dikerjakan' then
    raise exception 'Item tagihan hanya dapat dihapus saat WO berstatus dikerjakan';
  end if;

  -- 4. Jika part, kembalikan stok dengan kunci FOR UPDATE
  if v_billing.jenis = 'part' then
    select stok
    into v_stok_sekarang
    from public.inventory_items
    where id = v_billing.item_id
    for update;

    v_stok_baru := v_stok_sekarang + v_billing.jumlah;

    update public.inventory_items
    set stok = v_stok_baru,
        updated_at = now()
    where id = v_billing.item_id;

    -- Catat stock movements (kembali, jumlah positif)
    insert into public.stock_movements (
      item_id,
      jenis,
      jumlah,
      stok_sesudah,
      keterangan,
      work_order_id,
      dicatat_oleh
    ) values (
      v_billing.item_id,
      'kembali',
      v_billing.jumlah,
      v_stok_baru,
      'Pembatalan item dari ' || v_wo.nomor,
      v_billing.work_order_id,
      auth.uid()
    );
  end if;

  -- 5. Hapus baris billing_items (billing_item_costs terhapus on delete cascade)
  delete from public.billing_items
  where id = p_billing_item;
end;
$$;


-- 3. sesuaikan_harga_item
create or replace function public.sesuaikan_harga_item(
  p_billing_item uuid,
  p_harga bigint,
  p_alasan text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_billing record;
  v_ada_invoice boolean;
  v_modal bigint;
begin
  -- 1. Periksa peran
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh menyesuaikan harga item';
  end if;

  -- 2. Ambil baris billing_items
  select id, work_order_id, harga_master
  into v_billing
  from public.billing_items
  where id = p_billing_item;

  if not found then
    raise exception 'Item tagihan tidak ditemukan';
  end if;

  -- 3. Periksa apakah invoice sudah diterbitkan
  select exists(select 1 from public.invoices where work_order_id = v_billing.work_order_id)
  into v_ada_invoice;

  if v_ada_invoice then
    raise exception 'Harga tidak dapat disesuaikan karena invoice sudah diterbitkan';
  end if;

  -- 4. Validasi harga dan alasan
  if p_harga is null or p_harga < 0 then
    raise exception 'Harga tidak boleh kurang dari 0';
  end if;

  if p_harga <> v_billing.harga_master and (p_alasan is null or trim(p_alasan) = '') then
    raise exception 'Alasan penyesuaian harga wajib diisi jika harga diubah dari harga master';
  end if;

  -- 5. Update baris billing_items
  update public.billing_items
  set harga_dipakai = p_harga,
      alasan_penyesuaian = case when p_harga = harga_master then null else trim(p_alasan) end,
      disesuaikan_oleh = auth.uid(),
      disesuaikan_at = now()
  where id = p_billing_item;

  -- 6. Ambil harga modal dari billing_item_costs
  select coalesce(harga_modal, 0)
  into v_modal
  from public.billing_item_costs
  where billing_item_id = p_billing_item;

  if not found then
    v_modal := 0;
  end if;

  -- Mengembalikan true bila harga dipakai di bawah modal
  return (p_harga < v_modal);
end;
$$;


-- 4. atur_diskon
create or replace function public.atur_diskon(
  p_wo uuid,
  p_diskon bigint,
  p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_ada_invoice boolean;
  v_subtotal bigint;
begin
  -- 1. Periksa peran
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh mengatur diskon';
  end if;

  -- 2. Pastikan WO ada
  if not exists(select 1 from public.work_orders where id = p_wo) then
    raise exception 'Work Order tidak ditemukan';
  end if;

  -- 3. Periksa apakah invoice sudah diterbitkan
  select exists(select 1 from public.invoices where work_order_id = p_wo)
  into v_ada_invoice;

  if v_ada_invoice then
    raise exception 'Diskon tidak dapat diubah karena invoice sudah diterbitkan';
  end if;

  -- 4. Validasi nilai diskon
  if p_diskon is null or p_diskon < 0 then
    raise exception 'Diskon tidak boleh kurang dari 0';
  end if;

  -- 5. Hitung subtotal saat ini
  select coalesce(sum(jumlah * harga_dipakai), 0)
  into v_subtotal
  from public.billing_items
  where work_order_id = p_wo;

  if p_diskon > v_subtotal then
    raise exception 'Diskon tidak boleh melebihi subtotal (Rp%)', to_char(v_subtotal, 'FM999,999,999,999');
  end if;

  if p_diskon > 0 and (p_alasan is null or trim(p_alasan) = '') then
    raise exception 'Alasan diskon wajib diisi';
  end if;

  -- 6. Update work_orders
  update public.work_orders
  set diskon = p_diskon,
      alasan_diskon = case when p_diskon = 0 then null else trim(p_alasan) end,
      updated_at = now()
  where id = p_wo;
end;
$$;


-- 5. terbitkan_invoice
create or replace function public.terbitkan_invoice(
  p_wo uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_wo_status text;
  v_diskon bigint;
  v_subtotal bigint;
  v_total bigint;
  v_periode text;
  v_urut int;
  v_nomor_inv text;
  v_invoice_id uuid;
begin
  -- 1. Periksa peran
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh menerbitkan invoice';
  end if;

  -- 2. Kunci baris WO dengan FOR UPDATE
  select status, diskon
  into v_wo_status, v_diskon
  from public.work_orders
  where id = p_wo
  for update;

  if not found then
    raise exception 'Work Order tidak ditemukan';
  end if;

  if v_wo_status <> 'siap_diambil' then
    raise exception 'Invoice hanya dapat diterbitkan untuk WO yang siap diambil (status saat ini: %)', v_wo_status;
  end if;

  -- 3. Periksa apakah invoice sudah pernah terbit
  if exists(select 1 from public.invoices where work_order_id = p_wo) then
    raise exception 'Invoice untuk WO ini sudah pernah diterbitkan';
  end if;

  -- 4. Hitung subtotal dan total
  select coalesce(sum(jumlah * harga_dipakai), 0)
  into v_subtotal
  from public.billing_items
  where work_order_id = p_wo;

  if v_subtotal <= 0 then
    raise exception 'Tagihan tidak boleh kosong saat menerbitkan invoice';
  end if;

  v_total := greatest(0, v_subtotal - coalesce(v_diskon, 0));

  -- 5. Buat nomor invoice berurutan (INV-YYYYMM-0001) dengan kunci number_counters
  v_periode := to_char(now(), 'YYYYMM');
  v_urut := private.nomor_berikut('INV', v_periode);
  v_nomor_inv := 'INV-' || v_periode || '-' || lpad(v_urut::text, 4, '0');

  -- 6. Simpan invoice
  insert into public.invoices (
    work_order_id,
    nomor,
    subtotal,
    diskon,
    total,
    terbayar,
    status_bayar,
    diterbitkan_oleh,
    diterbitkan_at
  ) values (
    p_wo,
    v_nomor_inv,
    v_subtotal,
    coalesce(v_diskon, 0),
    v_total,
    0,
    'belum_bayar',
    auth.uid(),
    now()
  )
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;


-- 6. catat_pembayaran
create or replace function public.catat_pembayaran(
  p_invoice uuid,
  p_metode text,
  p_jumlah bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_inv record;
  v_sisa bigint;
  v_terbayar_baru bigint;
  v_status_baru text;
begin
  -- 1. Periksa peran
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh mencatat pembayaran';
  end if;

  -- 2. Kunci baris invoice dengan FOR UPDATE
  select id, total, terbayar, status_bayar
  into v_inv
  from public.invoices
  where id = p_invoice
  for update;

  if not found then
    raise exception 'Invoice tidak ditemukan';
  end if;

  -- 3. Validasi metode dan jumlah
  if p_metode not in ('tunai', 'transfer', 'qris') then
    raise exception 'Metode pembayaran harus berupa tunai, transfer, atau qris';
  end if;

  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'Jumlah pembayaran harus lebih dari 0';
  end if;

  v_sisa := v_inv.total - v_inv.terbayar;
  if p_jumlah > v_sisa then
    raise exception 'Jumlah pembayaran (Rp%) melebihi sisa tagihan (Rp%)',
      to_char(p_jumlah, 'FM999,999,999,999'),
      to_char(v_sisa, 'FM999,999,999,999');
  end if;

  -- 4. Tambah baris payments
  insert into public.payments (
    invoice_id,
    metode,
    jumlah,
    dicatat_oleh
  ) values (
    p_invoice,
    p_metode,
    p_jumlah,
    auth.uid()
  );

  -- 5. Perbarui terbayar dan status_bayar invoice
  v_terbayar_baru := v_inv.terbayar + p_jumlah;
  v_status_baru := case when v_terbayar_baru >= v_inv.total then 'lunas' else 'sebagian' end;

  update public.invoices
  set terbayar = v_terbayar_baru,
      status_bayar = v_status_baru
  where id = p_invoice;
end;
$$;


-- ----------------------------------------------------------------------------
-- Hak Eksekusi Fungsi
-- ----------------------------------------------------------------------------
revoke all on function public.tambah_item_tagihan(uuid, uuid, int) from public, anon;
grant execute on function public.tambah_item_tagihan(uuid, uuid, int) to authenticated;

revoke all on function public.hapus_item_tagihan(uuid) from public, anon;
grant execute on function public.hapus_item_tagihan(uuid) to authenticated;

revoke all on function public.sesuaikan_harga_item(uuid, bigint, text) from public, anon;
grant execute on function public.sesuaikan_harga_item(uuid, bigint, text) to authenticated;

revoke all on function public.atur_diskon(uuid, bigint, text) from public, anon;
grant execute on function public.atur_diskon(uuid, bigint, text) to authenticated;

revoke all on function public.terbitkan_invoice(uuid) from public, anon;
grant execute on function public.terbitkan_invoice(uuid) to authenticated;

revoke all on function public.catat_pembayaran(uuid, text, bigint) from public, anon;
grant execute on function public.catat_pembayaran(uuid, text, bigint) to authenticated;
