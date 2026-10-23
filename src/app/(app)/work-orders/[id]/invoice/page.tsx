import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rupiah, tanggal, tanggalWaktu } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { TombolCetak } from "./TombolCetak";

export default async function InvoiceWorkOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await ambilProfilSaya();

  // PRD 4: Hanya Admin dan Owner yang boleh membuka halaman invoice
  if (profil.peran !== "admin" && profil.peran !== "owner") {
    redirect(`/work-orders/${id}/tagihan`);
  }

  const supabase = await createClient();

  // 1. Ambil data Invoice
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
      diterbitkan_at,
      diterbitkan_oleh,
      mayar_link,
      dibayar_online_at,
      kasir:profiles!diterbitkan_oleh (nama)
    `)
    .eq("work_order_id", id)
    .maybeSingle();

  // 2. Ambil data Work Order, Pelanggan, dan Kendaraan
  const { data: wo } = await supabase
    .from("work_orders")
    .select(`
      id,
      nomor,
      odometer,
      status,
      vehicles:vehicle_id (
        plat,
        merek_model,
        tahun,
        warna,
        transmisi
      ),
      customers:customer_id (
        nama,
        telepon,
        alamat
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (!wo) notFound();

  // Jika invoice belum terbit, tampilkan pesan informatif
  if (!rawInvoice) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <Button
          asChild
          variant="outline"
          className="gap-1.5 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white font-mono text-xs"
        >
          <Link href={`/work-orders/${id}/tagihan`}>
            <ArrowLeft className="size-3.5 text-[#FF2E75]" />
            Kembali ke Tagihan
          </Link>
        </Button>

        <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-12 text-center space-y-4 shadow-sm">
          <div className="mx-auto size-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-xl font-bold font-mono text-white">Invoice Belum Diterbitkan</h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Invoice untuk Work Order <span className="font-semibold text-white font-mono">{wo.nomor}</span> belum
            diterbitkan. Pastikan status WO sudah mencapai &quot;Siap Diambil&quot;, lalu terbitkan invoice melalui
            tab Tagihan.
          </p>
          <Button asChild className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30 mt-2">
            <Link href={`/work-orders/${id}/tagihan`}>Buka Halaman Tagihan</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Ambil data baris tagihan
  const { data: items } = await supabase
    .from("billing_items")
    .select("id, nama_item, jenis, jumlah, harga_dipakai")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  // 4. Ambil data riwayat pembayaran
  const { data: payments } = await supabase
    .from("payments")
    .select("id, metode, jumlah, created_at")
    .eq("invoice_id", rawInvoice.id)
    .order("created_at", { ascending: true });

  // 5. Ambil data profil bengkel
  const { data: settings } = await supabase
    .from("workshop_settings")
    .select("nama, alamat, telepon, jam_buka, logo_path")
    .eq("id", 1)
    .maybeSingle();

  const logoUrl = settings?.logo_path
    ? supabase.storage.from("publik").getPublicUrl(settings.logo_path).data.publicUrl
    : null;

  const kasir = rawInvoice.kasir as unknown as { nama: string } | null;
  const kendaraan = wo.vehicles as unknown as {
    plat: string;
    merek_model: string;
    tahun: number | null;
    warna: string | null;
    transmisi: string | null;
  } | null;
  const pelanggan = wo.customers as unknown as {
    nama: string;
    telepon: string;
    alamat: string | null;
  } | null;

  const subtotal = Number(rawInvoice.subtotal);
  const diskon = Number(rawInvoice.diskon);
  const total = Number(rawInvoice.total);
  const terbayar = Number(rawInvoice.terbayar);
  const sisa = Math.max(0, total - terbayar);
  const statusBayar = rawInvoice.status_bayar;

  return (
    <div className="max-w-4xl mx-auto py-4 pb-16">
      {/* Tombol Aksi di Layar (Sembunyi saat Cetak) */}
      <TombolCetak
        woId={id}
        invoiceId={rawInvoice.id}
        statusBayarAwal={rawInvoice.status_bayar}
        dibayarOnlineAtAwal={rawInvoice.dibayar_online_at}
        peran={profil.peran}
      />

      {/* Lembar Invoice A4 Siap Cetak (Dokumen kertas putih standar faktur resmi) */}
      <div className="bg-white border border-zinc-300 shadow-2xl rounded-xl p-8 sm:p-12 text-slate-800 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        {/* Header Bengkel */}
        <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b-2 border-slate-800">
          <div className="flex items-start gap-4">
            {logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={settings?.nama || "Logo Bengkel"}
                className="h-16 w-auto max-w-[120px] object-contain"
              />
            )}
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {settings?.nama || "Cemerlang Jaya Motor"}
              </h1>
              <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                {settings?.alamat || "Jl. Raya Otomotif No. 88, Jakarta"}
              </p>
              <p className="text-xs text-slate-600">
                Telp / WhatsApp: {settings?.telepon || "0812-3456-7890"} · Jam Buka: {settings?.jam_buka || "Senin - Sabtu (08.00 - 17.00)"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block bg-slate-900 text-white font-bold text-sm tracking-wider px-3.5 py-1 uppercase rounded-sm mb-2">
              INVOICE RESMI
            </div>
            <div className="text-base font-bold text-slate-900 font-mono">
              {rawInvoice.nomor}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              Tanggal: {tanggal(rawInvoice.diterbitkan_at)}
            </div>
          </div>
        </div>

        {/* Informasi Pelanggan & Kendaraan */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-slate-200 text-xs">
          <div className="space-y-1.5">
            <p className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Ditujukan Kepada
            </p>
            <p className="font-bold text-sm text-slate-900">{pelanggan?.nama}</p>
            <p className="text-slate-600 font-mono">Telepon: {pelanggan?.telepon}</p>
            {pelanggan?.alamat && (
              <p className="text-slate-600 max-w-xs">{pelanggan.alamat}</p>
            )}
          </div>

          <div className="space-y-1.5 text-right sm:text-left">
            <p className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Data Kendaraan & Layanan
            </p>
            <p className="font-bold text-sm text-slate-900 font-mono">
              {kendaraan?.plat} · {kendaraan?.merek_model}
            </p>
            <p className="text-slate-600">
              No. WO: <span className="font-mono font-medium">{wo.nomor}</span> · Odometer: {wo.odometer.toLocaleString("id-ID")} km
            </p>
            {kendaraan?.tahun && (
              <p className="text-slate-600">
                Tahun: {kendaraan.tahun} {kendaraan.transmisi ? `(${kendaraan.transmisi})` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Tabel Pekerjaan & Spare Part (Bersih dari info modal / penyesuaian PRD 6.9) */}
        <div className="py-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-900 font-bold uppercase text-[11px]">
                <th className="py-2.5 w-10 text-center">No</th>
                <th className="py-2.5">Deskripsi Pekerjaan / Spare Part</th>
                <th className="py-2.5 w-20 text-center">Jenis</th>
                <th className="py-2.5 w-16 text-center">Qty</th>
                <th className="py-2.5 text-right w-28">Harga Satuan</th>
                <th className="py-2.5 text-right w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(items ?? []).map((it, idx) => (
                <tr key={it.id} className="text-slate-800">
                  <td className="py-2.5 text-center font-medium text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 font-medium">{it.nama_item}</td>
                  <td className="py-2.5 text-center capitalize text-slate-600">{it.jenis}</td>
                  <td className="py-2.5 text-center tabular-nums">{it.jumlah}</td>
                  <td className="py-2.5 text-right tabular-nums">{rupiah(Number(it.harga_dipakai))}</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">
                    {rupiah(it.jumlah * Number(it.harga_dipakai))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ringkasan Angka & Status Pembayaran */}
        <div className="grid grid-cols-2 gap-8 pt-4 pb-8 border-t-2 border-slate-800">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Status Pembayaran
              </p>
              <div className="inline-flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-xs font-bold uppercase rounded-sm ${
                    statusBayar === "lunas"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : statusBayar === "sebagian"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                  }`}
                >
                  {statusBayar === "lunas"
                    ? "LUNAS"
                    : statusBayar === "sebagian"
                    ? "DIBAYAR SEBAGIAN"
                    : "BELUM BAYAR"}
                </span>
              </div>
              {statusBayar === "lunas" && (
                <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                  Waktu dibayar:{" "}
                  <span className="font-semibold text-slate-800">
                    {tanggalWaktu(
                      rawInvoice.dibayar_online_at ||
                        (payments && payments.length > 0
                          ? payments[payments.length - 1].created_at
                          : rawInvoice.diterbitkan_at),
                    )}
                  </span>
                </p>
              )}
            </div>

            {/* Riwayat Pembayaran (jika ada) */}
            {payments && payments.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Catatan Pembayaran:
                </p>
                <div className="space-y-1 text-slate-600">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 font-mono text-[11px]">
                      <span>• {tanggal(p.created_at)}</span>
                      <span className="uppercase font-semibold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.metode}
                      </span>
                      <span className="tabular-nums font-medium text-emerald-700">
                        {rupiah(Number(p.jumlah))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kolom Angka Total */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium tabular-nums">{rupiah(subtotal)}</span>
            </div>

            {diskon > 0 && (
              <div className="flex justify-between text-rose-700 font-medium">
                <span>Diskon</span>
                <span className="tabular-nums">- {rupiah(diskon)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-2">
              <span>Total Tagihan</span>
              <span className="tabular-nums text-base">{rupiah(total)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Sudah Dibayar</span>
              <span className="font-semibold text-emerald-700 tabular-nums">
                {rupiah(terbayar)}
              </span>
            </div>

            <div className="flex justify-between font-bold text-slate-900 border-t border-dashed border-slate-300 pt-2">
              <span>Sisa Tagihan</span>
              <span
                className={`tabular-nums ${
                  sisa === 0 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {rupiah(sisa)}
              </span>
            </div>
          </div>
        </div>

        {/* Area Tanda Tangan */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs text-slate-700">
          <div className="space-y-16">
            <p className="font-medium">Tanda Tangan Pelanggan,</p>
            <div>
              <p className="font-bold underline uppercase">{pelanggan?.nama}</p>
              <p className="text-[10px] text-slate-500">Pemilik / Pengemudi</p>
            </div>
          </div>

          <div className="space-y-16">
            <p className="font-medium">Hormat Kami,</p>
            <div>
              <p className="font-bold underline uppercase">
                {kasir?.nama || profil.nama || "Kasir Bengkel"}
              </p>
              <p className="text-[10px] text-slate-500">Cemerlang Jaya Motor</p>
            </div>
          </div>
        </div>

        {/* Footer Terima Kasih */}
        <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Terima kasih atas kepercayaan Anda mempercayakan perawatan kendaraan kepada kami.
          Kenyamanan dan keselamatan Anda adalah prioritas kami.
        </div>
      </div>
    </div>
  );
}
