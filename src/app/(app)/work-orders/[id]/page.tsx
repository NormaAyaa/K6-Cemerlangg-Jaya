import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  Car,
  User,
  Phone,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import { BadgeStatus } from "@/components/BadgeStatus";
import { TabWorkOrder } from "@/components/TabWorkOrder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rupiah, tanggal } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { BagianPenugasan } from "./BagianPenugasan";
import { DialogUbahDataMasuk } from "./DialogUbahDataMasuk";
import { GaleriFotoWO, type FotoWOItem } from "./GaleriFotoWO";
import { TombolAksiStatus } from "./TombolAksiStatus";

export default async function RincianWorkOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // Ambil rincian lengkap Work Order dan riwayat status
  const [
    { data: wo, error: errWo },
    { data: riwayatStatus },
    { data: daftarKepalaMekanik },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select(`
        id, nomor, status, odometer, keluhan, diagnosis, estimasi_selesai, catatan_status, diskon, alasan_diskon,
        created_at, updated_at, selesai_at, diambil_at, dibuat_oleh,
        kepala_mekanik_id,
        customers(id, nama, telepon, email, alamat, tipe),
        vehicles(id, plat, merek_model, tahun, warna, transmisi),
        profiles:kepala_mekanik_id(id, nama),
        pembuat:dibuat_oleh(nama),
        work_order_mekanik(mekanik_id, mekanik(id, nama, aktif)),
        work_order_photos(id, jenis, path, created_at, diunggah_oleh),
        billing_items(id, nama_item, jenis, jumlah, harga_dipakai, harga_master),
        invoices(id, nomor, total, status_bayar, terbayar)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("wo_status_history")
      .select("id, dari_status, ke_status, catatan, created_at, profiles:oleh(nama)")
      .eq("work_order_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, nama")
      .eq("role", "kepala_mekanik")
      .eq("aktif", true)
      .order("nama"),
  ]);

  if (!wo || errWo) {
    notFound();
  }

  // Ambil daftar mekanik untuk tim WO ini jika status masih 'menunggu'
  let daftarMekanikTim: Array<{ id: string; nama: string; jumlahWoAktif: number }> = [];
  if (wo.status === "menunggu") {
    const [{ data: listMek }, { data: listAktif }] = await Promise.all([
      supabase
        .from("mekanik")
        .select("id, nama, aktif")
        .eq("kepala_mekanik_id", wo.kepala_mekanik_id)
        .eq("aktif", true)
        .order("nama"),
      supabase
        .from("work_order_mekanik")
        .select("mekanik_id, work_orders!inner(status)")
        .in("work_orders.status", ["menunggu", "dikerjakan", "tertunda"]),
    ]);

    const bebanMekanik = (listAktif ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.mekanik_id] = (acc[row.mekanik_id] || 0) + 1;
      return acc;
    }, {});

    daftarMekanikTim = (listMek ?? [])
      .map((m) => ({
        id: m.id,
        nama: m.nama,
        jumlahWoAktif: bebanMekanik[m.id] ?? 0,
      }))
      .sort((a, b) => a.jumlahWoAktif - b.jumlahWoAktif);
  }

  // Generate signed URLs untuk seluruh foto WO (berlaku 10 menit sesuai PRD 11.3)
  const fotoList = wo.work_order_photos ?? [];
  const pathsToSign: string[] = [];
  fotoList.forEach((f) => {
    pathsToSign.push(f.path);
    const parts = f.path.split("/");
    if (parts.length >= 3) {
      const thumbPath = `${parts[0]}/${parts[1]}/thumb/${parts.slice(2).join("/")}`;
      pathsToSign.push(thumbPath);
    }
  });

  const signedUrlMap = new Map<string, string>();
  if (pathsToSign.length > 0) {
    const { data: signedData } = await supabase.storage
      .from("foto-wo")
      .createSignedUrls(pathsToSign, 600);

    (signedData ?? []).forEach((s) => {
      if (s.signedUrl && s.path) {
        signedUrlMap.set(s.path, s.signedUrl);
      }
    });
  }

  const daftarFoto: FotoWOItem[] = fotoList.map((f) => {
    const parts = f.path.split("/");
    const thumbPath = parts.length >= 3 ? `${parts[0]}/${parts[1]}/thumb/${parts.slice(2).join("/")}` : f.path;
    return {
      id: f.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jenis: f.jenis as any,
      path: f.path,
      urlOriginal: signedUrlMap.get(f.path) || "",
      urlThumb: signedUrlMap.get(thumbPath) || signedUrlMap.get(f.path) || "",
    };
  });

  const hariIni = new Date().toISOString().split("T")[0];
  const terlambat =
    Boolean(wo.estimasi_selesai && wo.estimasi_selesai < hariIni) &&
    !["selesai", "siap_diambil", "diambil", "dibatalkan"].includes(wo.status);

  const mekanikDitugaskan = (wo.work_order_mekanik ?? []).map((wm) => ({
    id: wm.mekanik_id,
    nama: wm.mekanik?.nama || "Mekanik",
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = Array.isArray(wo.invoices) ? (wo.invoices as any)[0] : wo.invoices;
  const jumlahFotoKondisiAkhir = fotoList.filter((f) => f.jenis === "kondisi_akhir").length;

  const teleponWa = wo.customers?.telepon ? wo.customers.telepon.replace(/\D/g, "") : "";
  const waUrl = teleponWa.startsWith("0") ? `https://wa.me/62${teleponWa.slice(1)}` : `https://wa.me/${teleponWa}`;

  return (
    <div className="space-y-6 pb-16">
      {/* Navigasi Balik */}
      <Link
        href="/work-orders"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5 text-[#FF2E75]" />
        Kembali ke daftar Work Order
      </Link>

      {/* Header Halaman & Tab Rincian | Tagihan */}
      <div className="space-y-4">
        <TabWorkOrder id={id} />

        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111116] p-5 rounded-xl border border-zinc-800/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-white">{wo.nomor}</h1>
              <BadgeStatus status={wo.status} />
              {terlambat && (
                <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-400 gap-1 px-2 py-0.5 text-[10px] font-mono font-bold">
                  <AlertCircle className="size-3 mr-0.5" />
                  Terlambat
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Dibuat pada {tanggal(wo.created_at)} oleh <span className="text-zinc-200">{wo.pembuat?.nama || "Admin"}</span>
            </p>
          </div>

          {/* Tombol Transisi Status Resmi */}
          <TombolAksiStatus
            woId={wo.id}
            statusSaatIni={wo.status}
            peran={profil.peran}
            userId={profil.id}
            kepalaMekanikId={wo.kepala_mekanik_id}
            jumlahItemTagihan={wo.billing_items?.length ?? 0}
            statusBayarInvoice={invoice?.status_bayar}
            jumlahFotoKondisiAkhir={jumlahFotoKondisiAkhir}
          />
        </div>
      </div>

      {/* Pesan Catatan Status Terakhir (Bila Ada) */}
      {wo.catatan_status && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-mono flex items-start gap-3">
          <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-400 uppercase tracking-wider">Catatan Status Terakhir:</span>
            <p className="mt-1 text-zinc-300">{wo.catatan_status}</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          BAGIAN A. DATA MASUK (PRD 6.8 Bagian A)
          ========================================================================= */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <Car className="size-5 text-[#FF2E75]" />
            <h2 className="text-base font-semibold text-white">Bagian A. Data Masuk Kendaraan & Pelanggan</h2>
          </div>
          <DialogUbahDataMasuk
            woId={wo.id}
            statusSaatIni={wo.status}
            keluhanAwal={wo.keluhan}
            odometerAwal={wo.odometer}
            diagnosisAwal={wo.diagnosis}
            kepalaMekanikIdAwal={wo.kepala_mekanik_id}
            peran={profil.peran}
            userId={profil.id}
            daftarKepalaMekanik={daftarKepalaMekanik ?? []}
          />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kartu Pelanggan */}
            <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/60 space-y-3 shadow-inner">
              <h4 className="text-xs font-semibold text-zinc-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <User className="size-3.5 text-[#FF2E75]" />
                Data Pelanggan
              </h4>
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-white text-sm">{wo.customers?.nama ?? "-"}</p>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">{wo.customers?.telepon ?? "-"}</span>
                  {wo.customers?.telepon && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-mono"
                      asChild
                    >
                      <a href={waUrl} target="_blank" rel="noopener noreferrer">
                        <Phone className="size-3" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
                {wo.customers?.email && <p className="text-zinc-400 font-mono">{wo.customers.email}</p>}
                {wo.customers?.alamat && <p className="text-zinc-400">{wo.customers.alamat}</p>}
              </div>
            </div>

            {/* Kartu Kendaraan */}
            <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/60 space-y-3 shadow-inner">
              <h4 className="text-xs font-semibold text-zinc-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Car className="size-3.5 text-[#FF2E75]" />
                Data Kendaraan
              </h4>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-white text-base font-mono tracking-wider">{wo.vehicles?.plat ?? "-"}</p>
                <p className="font-medium text-zinc-200">
                  {wo.vehicles?.merek_model ?? "-"}{" "}
                  {wo.vehicles?.tahun ? `(${wo.vehicles.tahun})` : ""}
                </p>
                <p className="text-zinc-400 font-mono">
                  Warna: {wo.vehicles?.warna || "-"} · Transmisi: {wo.vehicles?.transmisi || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Odometer, Keluhan, dan Diagnosis */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/80 text-xs">
            <div>
              <dt className="text-xs font-mono text-zinc-400 uppercase">Odometer Masuk</dt>
              <dd className="mt-1 font-bold text-white text-base font-mono">
                {wo.odometer.toLocaleString("id-ID")} KM
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-xs font-mono text-zinc-400 uppercase">Keluhan Awal</dt>
              <dd className="mt-1 font-medium text-zinc-200 bg-zinc-900/80 p-3 rounded-md border border-zinc-800">
                {wo.keluhan}
              </dd>
            </div>
          </div>

          {/* Diagnosis Teknis Mekanik */}
          <div className="pt-2 border-t border-zinc-800/80">
            <dt className="text-xs font-mono text-zinc-400 uppercase">Diagnosis Masalah (Mekanik)</dt>
            <dd className="mt-1 font-medium text-zinc-200">
              {wo.diagnosis ? (
                <div className="p-3 bg-[#FF2E75]/10 border border-[#FF2E75]/20 rounded-md text-xs font-mono text-zinc-200">
                  {wo.diagnosis}
                </div>
              ) : (
                <span className="text-xs text-zinc-500 italic font-mono">
                  Diagnosis belum diisi. Kepala Mekanik dapat mengisi diagnosis selama pengerjaan.
                </span>
              )}
            </dd>
          </div>

          {/* Galeri Foto Masuk (STNK & Kondisi Awal) serta Foto Lainnya */}
          <div className="pt-2 border-t border-zinc-800/80">
            <GaleriFotoWO
              woId={wo.id}
              daftarFoto={daftarFoto}
              statusSaatIni={wo.status}
              peran={profil.peran}
              userId={profil.id}
              kepalaMekanikId={wo.kepala_mekanik_id}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          BAGIAN B. PENUGASAN (PRD 6.8 Bagian B)
          ========================================================================= */}
      <BagianPenugasan
        woId={wo.id}
        statusSaatIni={wo.status}
        peran={profil.peran}
        userId={profil.id}
        kepalaMekanikId={wo.kepala_mekanik_id}
        namaKepalaMekanik={wo.profiles?.nama || "Tim Mekanik"}
        mekanikDitugaskan={mekanikDitugaskan}
        estimasiSelesai={wo.estimasi_selesai}
        daftarMekanikTim={daftarMekanikTim}
      />

      {/* =========================================================================
          BAGIAN C. PENGERJAAN (PRD 6.8 Bagian C)
          ========================================================================= */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <FileText className="size-5 text-[#FF2E75]" />
            <h2 className="text-base font-semibold text-white">
              Bagian C. Pengerjaan (Spare Part & Jasa yang Digunakan)
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs gap-1.5"
          >
            <Link href={`/work-orders/${wo.id}/tagihan`}>
              Buka Tab Tagihan
              <ExternalLink className="size-3.5 text-[#FF2E75]" />
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900/40">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-900/90 border-b border-zinc-800 hover:bg-zinc-900/90">
                <TableHead className="pl-4 text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Nama Item</TableHead>
                <TableHead className="text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Jenis</TableHead>
                <TableHead className="text-center text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Jumlah</TableHead>
                <TableHead className="text-right text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Harga Satuan</TableHead>
                <TableHead className="pr-4 text-right text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {(wo.billing_items?.length ?? 0) === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-8 text-center text-zinc-500 font-mono">
                    Belum ada spare part atau jasa yang dicatat. Buka{" "}
                    <Link href={`/work-orders/${wo.id}/tagihan`} className="text-[#FF2E75] underline">
                      Tab Tagihan
                    </Link>{" "}
                    untuk mencatat spare part dan jasa.
                  </TableCell>
                </TableRow>
              ) : (
                wo.billing_items?.map((item) => {
                  const subtotal = item.jumlah * Number(item.harga_dipakai);
                  return (
                    <TableRow key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <TableCell className="pl-4 font-medium text-white">{item.nama_item}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.jenis === "part"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400 font-mono text-[10px]"
                              : "border-sky-500/20 bg-sky-500/10 text-sky-400 font-mono text-[10px]"
                          }
                        >
                          {item.jenis === "part" ? "Spare Part" : "Jasa Servis"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-white">{item.jumlah}</TableCell>
                      <TableCell className="text-right font-mono text-zinc-300">
                        {rupiah(Number(item.harga_dipakai))}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-mono font-semibold text-white">
                        {rupiah(subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Timestamp Penyelesaian & Penyerahan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-800/80 text-xs font-mono text-zinc-400">
          <div>
            <span>Waktu Selesai Pengerjaan:</span>{" "}
            <strong className="text-zinc-200">{wo.selesai_at ? tanggal(wo.selesai_at) : "-"}</strong>
          </div>
          <div>
            <span>Waktu Kendaraan Diserahkan:</span>{" "}
            <strong className="text-zinc-200">{wo.diambil_at ? tanggal(wo.diambil_at) : "-"}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          LINIMASA RIWAYAT WORK ORDER (PRD 6.8)
          ========================================================================= */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
          <Clock className="size-5 text-[#FF2E75]" />
          <h2 className="text-base font-semibold text-white">
            Riwayat & Linimasa Status Work Order
          </h2>
        </div>

        <div className="space-y-4">
          {(riwayatStatus?.length ?? 0) === 0 ? (
            <p className="text-xs text-zinc-500 font-mono italic">Belum ada riwayat status.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
              {riwayatStatus?.map((r) => (
                <div key={r.id} className="relative space-y-1">
                  <div className="absolute -left-6 top-1 size-3 rounded-full bg-[#FF2E75] ring-4 ring-[#111116]" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BadgeStatus status={r.ke_status} />
                      {r.dari_status && (
                        <span className="text-[11px] font-mono text-zinc-400">
                          (sebelumnya: {r.dari_status.replace("_", " ")})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {tanggal(r.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400">
                    Oleh: <span className="font-medium text-white">{r.profiles?.nama || "Sistem"}</span>
                  </p>

                  {r.catatan && (
                    <p className="text-xs font-mono bg-zinc-900/80 border border-zinc-800 p-2.5 rounded mt-1 text-zinc-200">
                      {r.catatan}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
