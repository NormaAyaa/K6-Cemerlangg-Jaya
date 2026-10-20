-- =============================================================
-- App 4 Cemerlang Jaya Motor · Fitur D (Audit Log & Proteksi)
-- Sesuai PRD 9.4 (Trigger catat_audit) dan PRD 10.2 / 10.3
-- =============================================================

-- 1. Fungsi trigger pencatatan audit log
create or replace function private.catat_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sebelum jsonb;
  v_sesudah jsonb;
  v_data_id text;
  v_alasan text;
begin
  if TG_OP = 'DELETE' then
    v_sebelum := to_jsonb(OLD);
    v_sesudah := null;
  elsif TG_OP = 'INSERT' then
    v_sebelum := null;
    v_sesudah := to_jsonb(NEW);
  else -- UPDATE
    v_sebelum := to_jsonb(OLD);
    v_sesudah := to_jsonb(NEW);
  end if;

  -- Ambil primary key ID (mendukung id, item_id, atau billing_item_id)
  v_data_id := coalesce(
    coalesce(v_sesudah, v_sebelum)->>'id',
    coalesce(v_sesudah, v_sebelum)->>'item_id',
    coalesce(v_sesudah, v_sebelum)->>'billing_item_id'
  );

  -- Ambil keterangan/alasan bila tersedia di baris data
  v_alasan := coalesce(
    coalesce(v_sesudah, v_sebelum)->>'alasan',
    coalesce(v_sesudah, v_sebelum)->>'alasan_diskon',
    coalesce(v_sesudah, v_sebelum)->>'catatan_status',
    coalesce(v_sesudah, v_sebelum)->>'keterangan'
  );

  -- Tulis ke audit_logs
  insert into public.audit_logs (
    pelaku_id,
    pelaku_peran,
    aksi,
    tabel,
    data_id,
    sebelum,
    sesudah,
    alasan
  ) values (
    auth.uid(),
    private.peran_saya(),
    TG_OP,
    TG_TABLE_NAME,
    v_data_id,
    v_sebelum,
    v_sesudah,
    v_alasan
  );

  return coalesce(NEW, OLD);
end;
$$;

-- 2. Pasang trigger catat_audit di 9 tabel PRD 9.4
drop trigger if exists catat_audit on public.work_orders;
create trigger catat_audit
after insert or update or delete on public.work_orders
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.billing_items;
create trigger catat_audit
after insert or update or delete on public.billing_items
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.billing_item_costs;
create trigger catat_audit
after insert or update or delete on public.billing_item_costs
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.inventory_items;
create trigger catat_audit
after insert or update or delete on public.inventory_items
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.inventory_costs;
create trigger catat_audit
after insert or update or delete on public.inventory_costs
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.invoices;
create trigger catat_audit
after insert or update or delete on public.invoices
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.payments;
create trigger catat_audit
after insert or update or delete on public.payments
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.stock_movements;
create trigger catat_audit
after insert or update or delete on public.stock_movements
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.profiles;
create trigger catat_audit
after insert or update or delete on public.profiles
for each row execute function private.catat_audit();

-- 3. Proteksi keabadian audit_logs: tidak bisa diubah atau dihapus oleh siapa pun
create or replace function private.cegah_ubah_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Log audit bersifat permanen dan tidak dapat diubah atau dihapus';
end;
$$;

drop trigger if exists cegah_ubah_audit on public.audit_logs;
create trigger cegah_ubah_audit
before update or delete on public.audit_logs
for each row execute function private.cegah_ubah_audit();

-- Cabut izin update dan delete dari audit_logs
revoke update, delete on public.audit_logs from public, anon, authenticated;
