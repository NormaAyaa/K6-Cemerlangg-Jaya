import { notFound } from "next/navigation";
import { TabWorkOrder } from "@/components/TabWorkOrder";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import {
  KomponenTagihan,
  type ItemTagihan,
  type InvoiceData,
  type PaymentData,
  type InventoryOption,
} from "./KomponenTagihan";

export default async function TagihanWorkOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // 1. Ambil data Work Order beserta Pelanggan & Kendaraan
  const { data: wo, error: errWo } = await supabase
    .from("work_orders")
    .select(`
      id,
      nomor,
      status,
      diskon,
      alasan_diskon,
      kepala_mekanik_id,
      vehicles:vehicle_id (
        plat,
        merek_model
      ),
      customers:customer_id (
        nama,
        telepon
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (errWo || !wo) {
    notFound();
  }

  // PRD 4 & 10.2: Kepala Mekanik hanya boleh melihat WO timnya
  if (profil.peran === "kepala_mekanik" && wo.kepala_mekanik_id !== profil.id) {
    return (
      <div className="tema-tagihan -m-4 min-h-dvh bg-background p-4 text-foreground md:-m-8 md:p-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <TabWorkOrder id={id} />
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-6 text-center text-text">
            <h2 className="text-lg font-semibold">Akses Terbatas</h2>
            <p className="mt-1 text-sm text-text-muted">
              Work Order ini ditangani oleh tim lain. Anda hanya dapat melihat dan mengelola tagihan WO milik tim Anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Ambil baris billing_items
  const { data: rawItems } = await supabase
    .from("billing_items")
    .select(`
      id,
      item_id,
      nama_item,
      jenis,
      jumlah,
      harga_master,
      harga_dipakai,
      alasan_penyesuaian,
      disesuaikan_at,
      disesuaikan_oleh,
      pengubah:profiles!disesuaikan_oleh(nama)
    `)
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  // 3. Khusus Owner: Ambil harga modal dari billing_item_costs
  const mapModal: Record<string, number> = {};
  if (profil.peran === "owner") {
    const itemIds = (rawItems ?? []).map((i) => i.id);
    if (itemIds.length > 0) {
      const { data: costs } = await supabase
        .from("billing_item_costs")
        .select("billing_item_id, harga_modal")
        .in("billing_item_id", itemIds);

      costs?.forEach((c) => {
        mapModal[c.billing_item_id] = Number(c.harga_modal);
      });
    }
  }

  const items: ItemTagihan[] = (rawItems ?? []).map((it) => {
    // Supabase relation query mapping
    const pengubah = it.pengubah as unknown as { nama: string } | null;
    return {
      id: it.id,
      item_id: it.item_id,
      nama_item: it.nama_item,
      jenis: it.jenis as "part" | "jasa",
      jumlah: it.jumlah,
      harga_master: Number(it.harga_master),
      harga_dipakai: Number(it.harga_dipakai),
      alasan_penyesuaian: it.alasan_penyesuaian,
      disesuaikan_at: it.disesuaikan_at,
      disesuaikan_oleh: it.disesuaikan_oleh,
      nama_pengubah: pengubah?.nama ?? null,
      harga_modal: mapModal[it.id] ?? 0,
    };
  });

  // 4. Ambil Invoice bila sudah terbit
  const { data: rawInvoice } = await supabase
    .from("invoices")
    .select(`
      id,
      nomor,
      subtotal,
      diskon,
      total,
      terbayar,
      status_bayar,
      diterbitkan_at
    `)
    .eq("work_order_id", id)
    .maybeSingle();

  const invoice: InvoiceData | null = rawInvoice
    ? {
        id: rawInvoice.id,
        nomor: rawInvoice.nomor,
        subtotal: Number(rawInvoice.subtotal),
        diskon: Number(rawInvoice.diskon),
        total: Number(rawInvoice.total),
        terbayar: Number(rawInvoice.terbayar),
        status_bayar: rawInvoice.status_bayar as "belum_bayar" | "sebagian" | "lunas",
        diterbitkan_at: rawInvoice.diterbitkan_at,
      }
    : null;

  // 5. Ambil data Payments bila invoice ada
  let payments: PaymentData[] = [];
  if (invoice) {
    const { data: rawPayments } = await supabase
      .from("payments")
      .select(`
        id,
        metode,
        jumlah,
        created_at,
        pencatat:profiles!dicatat_oleh(nama)
      `)
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: false });

    payments = (rawPayments ?? []).map((p) => {
      const pencatat = p.pencatat as unknown as { nama: string } | null;
      return {
        id: p.id,
        metode: p.metode,
        jumlah: Number(p.jumlah),
        created_at: p.created_at,
        nama_pencatat: pencatat?.nama ?? null,
      };
    });
  }

  // 6. Ambil daftar inventory_items aktif untuk pilihan tambah item
  const { data: rawInventory } = await supabase
    .from("inventory_items")
    .select("id, kode, nama, jenis, stok, harga_jual")
    .eq("aktif", true)
    .order("nama");

  const inventoryItems: InventoryOption[] = (rawInventory ?? []).map((it) => ({
    id: it.id,
    kode: it.kode,
    nama: it.nama,
    jenis: it.jenis as "part" | "jasa",
    stok: it.stok,
    harga_jual: Number(it.harga_jual),
  }));

  const kendaraan = wo.vehicles as unknown as { plat: string; merek_model: string } | null;
  const pelanggan = wo.customers as unknown as { nama: string; telepon: string } | null;

  return (
    <div className="tema-tagihan -m-4 min-h-dvh bg-background p-4 text-foreground md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <TabWorkOrder id={id} />

        <KomponenTagihan
          woId={wo.id}
          nomorWo={wo.nomor}
          statusWo={wo.status}
          diskonWo={Number(wo.diskon)}
          alasanDiskonWo={wo.alasan_diskon}
          kepalaMekanikId={wo.kepala_mekanik_id}
          platKendaraan={kendaraan?.plat ?? "-"}
          merekModel={kendaraan?.merek_model ?? "-"}
          namaPelanggan={pelanggan?.nama ?? "-"}
          profil={profil}
          items={items}
          invoice={invoice}
          payments={payments}
          inventoryItems={inventoryItems}
        />
      </div>
    </div>
  );
}
