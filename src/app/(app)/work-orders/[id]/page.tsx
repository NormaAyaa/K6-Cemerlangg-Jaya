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
  CheckCircle2,
} from "lucide-react";
import { BadgeStatus } from "@/components/BadgeStatus";
import { TabWorkOrder } from "@/components/TabWorkOrder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const invoice = Array.isArray(wo.invoices) ? (wo.invoices as any)[0] : wo.invoices;
  const jumlahFotoKondisiAkhir = fotoList.filter((f) => f.jenis === "kondisi_akhir").length;

  const teleponWa = wo.customers?.telepon ? wo.customers.telepon.replace(/\D/g, "") : "";
  const waUrl = teleponWa.startsWith("0") ? `https://wa.me/62${teleponWa.slice(1)}` : `https://wa.me/${teleponWa}`;

  return (
    <div className="space-y-6 pb-16">
      {/* Navigasi Balik */}
      <Link
        href="/work-orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-text transition-colors"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar Work Order
      </Link>

      {/* Header Halaman & Tab Rincian | Tagihan */}
      <div className="space-y-4">
        <TabWorkOrder id={id} />

        <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-text">{wo.nomor}</h1>
              <BadgeStatus status={wo.status} />
              {terlambat && (
                <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-xs font-semibold">
                  <AlertCircle className="size-3.5" />
                  Terlambat
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Dibuat pada {tanggal(wo.created_at)} oleh {wo.pembuat?.nama || "Admin"}
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
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm flex items-start gap-3">
          <AlertCircle className="size-5 text-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-text">Catatan Status Terakhir:</span>
            <p className="mt-0.5 text-muted-foreground">{wo.catatan_status}</p>
          </div>
        </div>
      )}

      {/* =========================================================================
          BAGIAN A. DATA MASUK (PRD 6.8 Bagian A)
          ========================================================================= */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="size-5 text-primary" />
            Bagian A. Data Masuk Kendaraan & Pelanggan
          </CardTitle>
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
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kartu Pelanggan */}
            <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="size-3.5" />
                Data Pelanggan
              </h4>
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-text text-base">{wo.customers?.nama ?? "-"}</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{wo.customers?.telepon ?? "-"}</span>
                  {wo.customers?.telepon && (
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1 text-emerald-700" asChild>
                      <a href={waUrl} target="_blank" rel="noopener noreferrer">
                        <Phone className="size-3" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
                {wo.customers?.email && <p className="text-xs text-muted-foreground">{wo.customers.email}</p>}
                {wo.customers?.alamat && <p className="text-xs text-muted-foreground">{wo.customers.alamat}</p>}
              </div>
            </div>

            {/* Kartu Kendaraan */}
            <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Car className="size-3.5" />
                Data Kendaraan
              </h4>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-text text-lg tracking-wide">{wo.vehicles?.plat ?? "-"}</p>
                <p className="font-medium text-text">
                  {wo.vehicles?.merek_model ?? "-"}{" "}
                  {wo.vehicles?.tahun ? `(${wo.vehicles.tahun})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Warna: {wo.vehicles?.warna || "-"} · Transmisi: {wo.vehicles?.transmisi || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Odometer, Keluhan, dan Diagnosis */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Odometer Masuk</dt>
              <dd className="mt-1 font-bold text-text text-lg tabular-nums">
                {wo.odometer.toLocaleString("id-ID")} KM
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Keluhan Awal</dt>
              <dd className="mt-1 font-medium text-text bg-card p-3 rounded-md border border-border">
                {wo.keluhan}
              </dd>
            </div>
          </div>

          {/* Diagnosis Teknis Mekanik */}
          <div className="pt-2 border-t border-border">
            <dt className="text-xs text-muted-foreground">Diagnosis Masalah (Mekanik)</dt>
            <dd className="mt-1 font-medium text-text">
              {wo.diagnosis ? (
                <div className="p-3 bg-primary-soft/30 border border-primary/20 rounded-md text-sm text-text">
                  {wo.diagnosis}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Diagnosis belum diisi. Kepala Mekanik dapat mengisi diagnosis selama pengerjaan.
                </span>
              )}
            </dd>
          </div>

          {/* Galeri Foto Masuk (STNK & Kondisi Awal) serta Foto Lainnya */}
          <div className="pt-2 border-t border-border">
            <GaleriFotoWO
              woId={wo.id}
              daftarFoto={daftarFoto}
              statusSaatIni={wo.status}
              peran={profil.peran}
              userId={profil.id}
              kepalaMekanikId={wo.kepala_mekanik_id}
            />
          </div>
        </CardContent>
      </Card>

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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Bagian C. Pengerjaan (Spare Part & Jasa yang Digunakan)
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/work-orders/${wo.id}/tagihan`}>
              Buka Tab Tagihan
              <ExternalLink className="size-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama Item</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="text-center">Jumlah</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="pr-4 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(wo.billing_items?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada spare part atau jasa yang dicatat. Buka{" "}
                    <Link href={`/work-orders/${wo.id}/tagihan`} className="text-primary underline">
                      Tab Tagihan
                    </Link>{" "}
                    untuk mencatat spare part dan jasa.
                  </TableCell>
                </TableRow>
              ) : (
                wo.billing_items?.map((item) => {
                  const subtotal = item.jumlah * Number(item.harga_dipakai);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 font-medium">{item.nama_item}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.jenis === "part" ? "Spare Part" : "Jasa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{item.jumlah}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rupiah(Number(item.harga_dipakai))}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-medium tabular-nums">
                        {rupiah(subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Timestamp Penyelesaian & Penyerahan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border text-xs text-muted-foreground">
            <div>
              <span>Waktu Selesai Pengerjaan:</span>{" "}
              <strong className="text-text">{wo.selesai_at ? tanggal(wo.selesai_at) : "-"}</strong>
            </div>
            <div>
              <span>Waktu Kendaraan Diserahkan:</span>{" "}
              <strong className="text-text">{wo.diambil_at ? tanggal(wo.diambil_at) : "-"}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =========================================================================
          LINIMASA RIWAYAT WORK ORDER (PRD 6.8)
          ========================================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            Riwayat & Linimasa Status Work Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(riwayatStatus?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground italic">Belum ada riwayat status.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {riwayatStatus?.map((r) => (
                  <div key={r.id} className="relative space-y-1">
                    <div className="absolute -left-6 top-1 size-3 rounded-full bg-primary ring-4 ring-card" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BadgeStatus status={r.ke_status} />
                        {r.dari_status && (
                          <span className="text-xs text-muted-foreground">
                            (sebelumnya: {r.dari_status.replace("_", " ")})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {tanggal(r.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Oleh: <span className="font-medium text-text">{r.profiles?.nama || "Sistem"}</span>
                    </p>

                    {r.catatan && (
                      <p className="text-xs bg-muted/30 border border-border p-2 rounded mt-1 text-text">
                        {r.catatan}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
