-- ============================================================================
-- Fitur: Pembayaran Online Mayar Sandbox (API V2)
-- ============================================================================

-- 1. Tambah kolom mayar di invoices
alter table public.invoices
  add column if not exists mayar_invoice_id text,
  add column if not exists mayar_link text,
  add column if not exists mayar_jumlah bigint,
  add column if not exists dibayar_online_at timestamptz;

create index if not exists idx_invoices_mayar_invoice_id
  on public.invoices (mayar_invoice_id);

-- 2. Perbarui constraint payments_metode_check di payments agar mendukung 'mayar'
alter table public.payments
  drop constraint if exists payments_metode_check;

alter table public.payments
  add constraint payments_metode_check
  check (metode in ('tunai', 'transfer', 'qris', 'mayar'));

-- 3. Buat tabel mayar_webhook_log (RLS aktif, hanya Owner yang membaca)
create table if not exists public.mayar_webhook_log (
  id uuid primary key default gen_random_uuid(),
  event text,
  mayar_invoice_id text,
  payload jsonb not null,
  status text not null check (status in ('diterima', 'ditolak')),
  alasan text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mayar_webhook_log_invoice
  on public.mayar_webhook_log (mayar_invoice_id);

alter table public.mayar_webhook_log enable row level security;

drop policy if exists "mayar_webhook_log_owner_baca" on public.mayar_webhook_log;
create policy "mayar_webhook_log_owner_baca"
  on public.mayar_webhook_log
  for select
  to authenticated
  using ((select private.peran_saya()) = 'owner');

grant select on public.mayar_webhook_log to authenticated;
grant all on public.mayar_webhook_log to service_role;

-- 4. Fungsi simpan_link_mayar untuk Admin dan Owner
create or replace function public.simpan_link_mayar(
  p_invoice_id uuid,
  p_mayar_invoice_id text,
  p_mayar_link text,
  p_mayar_jumlah bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_inv record;
begin
  -- Periksa peran pemanggil di awal (hanya Admin atau Owner)
  v_peran := private.peran_saya();
  if v_peran is null or v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh menyimpan tautan pembayaran Mayar';
  end if;

  -- Validasi input
  if p_invoice_id is null then
    raise exception 'ID Invoice wajib diisi';
  end if;
  if p_mayar_invoice_id is null or trim(p_mayar_invoice_id) = '' then
    raise exception 'ID Invoice Mayar wajib diisi';
  end if;
  if p_mayar_link is null or trim(p_mayar_link) = '' then
    raise exception 'Tautan pembayaran Mayar wajib diisi';
  end if;
  if p_mayar_jumlah is null or p_mayar_jumlah <= 0 then
    raise exception 'Jumlah pembayaran Mayar harus lebih dari 0';
  end if;

  -- Kunci baris invoice dengan FOR UPDATE
  select id, status_bayar, total, terbayar
  into v_inv
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice tidak ditemukan';
  end if;

  if v_inv.status_bayar = 'lunas' then
    raise exception 'Invoice sudah lunas, tautan pembayaran baru tidak dapat dibuat';
  end if;

  if p_mayar_jumlah > (v_inv.total - v_inv.terbayar) then
    raise exception 'Jumlah pembayaran Mayar (Rp%) melebihi sisa tagihan (Rp%)',
      to_char(p_mayar_jumlah, 'FM999,999,999,999'),
      to_char(v_inv.total - v_inv.terbayar, 'FM999,999,999,999');
  end if;

  -- Perbarui kolom Mayar pada invoice
  update public.invoices
  set mayar_invoice_id = trim(p_mayar_invoice_id),
      mayar_link = trim(p_mayar_link),
      mayar_jumlah = p_mayar_jumlah
  where id = p_invoice_id;
end;
$$;

revoke all on function public.simpan_link_mayar(uuid, text, text, bigint) from public, anon;
grant execute on function public.simpan_link_mayar(uuid, text, text, bigint) to authenticated;

-- 5. Fungsi tandai_lunas_mayar (Hanya dieksekusi dengan secret key / service_role)
create or replace function public.tandai_lunas_mayar(
  p_mayar_invoice_id text,
  p_invoice_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_inv record;
  v_terbayar_baru bigint;
  v_status_baru text;
begin
  -- Validasi pemanggil hanya service_role atau postgres (secret key backend)
  v_role := coalesce(auth.role(), '');
  if v_role <> 'service_role' and current_user not in ('service_role', 'postgres') then
    raise exception 'Fungsi ini hanya dapat dijalankan oleh backend menggunakan secret key';
  end if;

  -- Validasi input
  if (p_mayar_invoice_id is null or trim(p_mayar_invoice_id) = '') and p_invoice_id is null then
    raise exception 'ID Invoice Mayar atau ID Invoice wajib diisi';
  end if;

  -- Kunci baris invoice dengan FOR UPDATE
  select id, total, terbayar, status_bayar, mayar_jumlah
  into v_inv
  from public.invoices
  where (p_mayar_invoice_id is not null and mayar_invoice_id = trim(p_mayar_invoice_id))
     or (p_invoice_id is not null and id = p_invoice_id)
  for update;

  if not found then
    raise exception 'Invoice tidak ditemukan untuk ID Mayar %', p_mayar_invoice_id;
  end if;

  -- Idempoten: bila sudah lunas, tidak perlu mencatat pembayaran ulang
  if v_inv.status_bayar = 'lunas' then
    return;
  end if;

  if v_inv.mayar_jumlah is null or v_inv.mayar_jumlah <= 0 then
    raise exception 'Jumlah tagihan online Mayar belum dicatat pada invoice ini';
  end if;

  -- Catat pembayaran di tabel payments sebesar mayar_jumlah (dicatat_oleh = null)
  insert into public.payments (
    invoice_id,
    metode,
    jumlah,
    dicatat_oleh
  ) values (
    v_inv.id,
    'mayar',
    v_inv.mayar_jumlah,
    null
  );

  -- Perbarui status_bayar, akumulasi terbayar, dan dibayar_online_at
  v_terbayar_baru := v_inv.terbayar + v_inv.mayar_jumlah;
  v_status_baru := case when v_terbayar_baru >= v_inv.total then 'lunas' else 'sebagian' end;

  update public.invoices
  set terbayar = v_terbayar_baru,
      status_bayar = v_status_baru,
      dibayar_online_at = now()
  where id = v_inv.id;
end;
$$;

revoke all on function public.tandai_lunas_mayar(text, uuid) from public, anon, authenticated;
grant execute on function public.tandai_lunas_mayar(text, uuid) to service_role;
