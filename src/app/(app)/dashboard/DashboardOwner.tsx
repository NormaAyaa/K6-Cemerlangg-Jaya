import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Clock,
  DollarSign,
  History,
  Package,
  Percent,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rupiah, tanggal } from "@/lib/format";
import { GrafikLabaHarian } from "./GrafikLabaHarian";
import { GrafikKomposisiPendapatan } from "./GrafikKomposisiPendapatan";
import { GrafikWoStatus } from "./GrafikWoStatus";
import { GrafikBebanMekanik } from "./GrafikBebanMekanik";

export type OwnerDashboardProps = {
  ringkasan: {
    pendapatan: number;
    pendapatan_sebelumnya: number;
    laba_kotor: number;
    laba_kotor_sebelumnya: number;
    margin_persen: number;
    wo_aktif: number;
    wo_terlambat: number;
    piutang: number;
  };
  labaHarian: Array<{ tanggal: string; pendapatan: number; modal: number; laba: number }>;
  pendapatanHarian: Array<{ tanggal: string; pendapatan_jasa: number; pendapatan_part: number }>;
  woStatus: Array<{ status: string; jumlah: number }>;
  bebanMekanik: Array<{ mekanik: string; tim: string; wo_aktif: number; wo_selesai: number }>;
  topParts: Array<{ nama: string; jumlah: number; pendapatan: number }>;
  topJasa: Array<{ nama: string; jumlah: number; pendapatan: number }>;
  auditTerbaru: Array<{
    id: number;
    waktu: string;
    pelaku_nama: string;
    pelaku_peran: string | null;
    aksi: string;
    tabel: string;
    alasan: string | null;
  }>;
};

export function DashboardOwner({
  ringkasan,
  labaHarian,
  pendapatanHarian,
  woStatus,
  bebanMekanik,
  topParts,
  topJasa,
  auditTerbaru,
}: OwnerDashboardProps) {
  // Hitung persentase perbandingan pendapatan & laba dari periode sebelumnya
  const persenPendapatan =
    ringkasan.pendapatan_sebelumnya > 0
      ? Math.round(
          ((ringkasan.pendapatan - ringkasan.pendapatan_sebelumnya) / ringkasan.pendapatan_sebelumnya) * 100
        )
      : null;

  const persenLaba =
    ringkasan.laba_kotor_sebelumnya > 0
      ? Math.round(
          ((ringkasan.laba_kotor - ringkasan.laba_kotor_sebelumnya) / Math.abs(ringkasan.laba_kotor_sebelumnya)) * 100
        )
      : null;

  // Total pendapatan jasa dan part untuk grafik komposisi
  const totalJasa = pendapatanHarian.reduce((acc, row) => acc + (row.pendapatan_jasa || 0), 0);
  const totalPart = pendapatanHarian.reduce((acc, row) => acc + (row.pendapatan_part || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Baris Kartu KPI (6 Kartu Sesuai PRD 12.2) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Pendapatan */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">Pendapatan</CardTitle>
            <DollarSign className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tracking-tight text-text">
              {rupiah(ringkasan.pendapatan || 0)}
            </div>
            {persenPendapatan !== null ? (
              <p className="mt-1 flex items-center text-xs font-medium">
                {persenPendapatan >= 0 ? (
                  <span className="flex items-center text-emerald-600">
                    <ArrowUpRight className="size-3.5 mr-0.5" />
                    +{persenPendapatan}%
                  </span>
                ) : (
                  <span className="flex items-center text-rose-600">
                    <ArrowDownRight className="size-3.5 mr-0.5" />
                    {persenPendapatan}%
                  </span>
                )}
                <span className="ml-1 text-text-muted">vs periode lalu</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-text-muted">Periode ini</p>
            )}
          </CardContent>
        </Card>

        {/* Laba Kotor */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">Laba Kotor</CardTitle>
            <TrendingUp className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold tracking-tight ${(ringkasan.laba_kotor || 0) < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {rupiah(ringkasan.laba_kotor || 0)}
            </div>
            {persenLaba !== null ? (
              <p className="mt-1 flex items-center text-xs font-medium">
                {persenLaba >= 0 ? (
                  <span className="flex items-center text-emerald-600">
                    <ArrowUpRight className="size-3.5 mr-0.5" />
                    +{persenLaba}%
                  </span>
                ) : (
                  <span className="flex items-center text-rose-600">
                    <ArrowDownRight className="size-3.5 mr-0.5" />
                    {persenLaba}%
                  </span>
                )}
                <span className="ml-1 text-text-muted">vs periode lalu</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-text-muted">Setelah modal part</p>
            )}
          </CardContent>
        </Card>

        {/* Margin % */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">Margin Laba</CardTitle>
            <Percent className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tracking-tight text-text">
              {ringkasan.margin_persen || 0}%
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Laba / pendapatan
            </p>
          </CardContent>
        </Card>

        {/* WO Aktif */}
        <Link href="/work-orders" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border bg-card hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-text-muted">WO Aktif</CardTitle>
              <Clock className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold tracking-tight text-text">
                {ringkasan.wo_aktif || 0}
              </div>
              <p className="mt-1 text-xs text-primary flex items-center">
                Buka antrean WO <ArrowUpRight className="size-3 ml-0.5" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* WO Terlambat */}
        <Link href="/work-orders?status=terlambat" className="block transition-transform hover:-translate-y-0.5">
          <Card className={`border-border bg-card transition-colors ${ringkasan.wo_terlambat > 0 ? "border-rose-300 dark:border-rose-800 bg-rose-50/20" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-text-muted">WO Terlambat</CardTitle>
              <AlertTriangle className={`size-4 ${ringkasan.wo_terlambat > 0 ? "text-rose-600 animate-pulse" : "text-text-muted"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold tracking-tight ${ringkasan.wo_terlambat > 0 ? "text-rose-600" : "text-text"}`}>
                {ringkasan.wo_terlambat || 0}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Lewat estimasi selesai
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Piutang */}
        <Link href="/laporan-laba" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border bg-card hover:border-amber-500/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-text-muted">Total Piutang</CardTitle>
              <Banknote className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {rupiah(ringkasan.piutang || 0)}
              </div>
              <p className="mt-1 text-xs text-text-muted truncate">
                Belum terlunasi
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 2. Bagian Grafik Utama */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Grafik Pendapatan & Laba Harian (2 Kolom) */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-text">Pendapatan & Laba Harian</CardTitle>
              <p className="text-xs text-text-muted">Tren pendapatan, modal spare part, dan laba kotor</p>
            </div>
            <Link href="/laporan-laba" className="text-xs text-primary hover:underline flex items-center">
              Laporan Lengkap <ArrowUpRight className="size-3 ml-0.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <GrafikLabaHarian data={labaHarian} />
          </CardContent>
        </Card>

        {/* Komposisi Pendapatan Jasa vs Part (1 Kolom) */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-text">Komposisi Pendapatan</CardTitle>
            <p className="text-xs text-text-muted">Perbandingan jasa vs spare part</p>
          </CardHeader>
          <CardContent className="pt-2">
            <GrafikKomposisiPendapatan
              pendapatanJasa={totalJasa}
              pendapatanPart={totalPart}
            />
          </CardContent>
        </Card>
      </div>

      {/* 3. Baris Kedua Grafik: WO per Status & Beban Tim Mekanik */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* WO Per Status */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-text">Work Order per Status</CardTitle>
              <p className="text-xs text-text-muted">Distribusi seluruh WO di bengkel saat ini</p>
            </div>
            <span className="text-xs text-text-muted">Klik batang untuk melihat</span>
          </CardHeader>
          <CardContent className="pt-2">
            <GrafikWoStatus data={woStatus} />
          </CardContent>
        </Card>

        {/* Beban Tim Mekanik */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-text">Beban Mekanik per Tim</CardTitle>
            <p className="text-xs text-text-muted">WO aktif & selesai periode ini per mekanik</p>
          </CardHeader>
          <CardContent className="pt-2">
            <GrafikBebanMekanik data={bebanMekanik} />
          </CardContent>
        </Card>
      </div>

      {/* 4. Baris Ketiga: Top 5 Item Terlaris & Aktivitas Audit Terbaru */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top 5 Spare Part */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Package className="size-4 text-amber-500" />
              Top 5 Spare Part
            </CardTitle>
            <Link href="/inventory" className="text-xs text-primary hover:underline">
              Inventory
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {topParts.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">Belum ada penjualan spare part</p>
            ) : (
              topParts.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text truncate max-w-[180px]">{item.nama}</span>
                    <span className="font-semibold text-text">{rupiah(item.pendapatan)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>Terjual {item.jumlah} unit</span>
                    <span>#{idx + 1}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-bg-app overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (item.jumlah / (topParts[0]?.jumlah || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top 5 Jasa Servis */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Wrench className="size-4 text-blue-500" />
              Top 5 Jasa Servis
            </CardTitle>
            <Link href="/inventory" className="text-xs text-primary hover:underline">
              Katalog
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {topJasa.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">Belum ada pengerjaan jasa</p>
            ) : (
              topJasa.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text truncate max-w-[180px]">{item.nama}</span>
                    <span className="font-semibold text-text">{rupiah(item.pendapatan)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>Dikerjakan {item.jumlah} kali</span>
                    <span>#{idx + 1}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-bg-app overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (item.jumlah / (topJasa[0]?.jumlah || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Aktivitas Audit Terbaru (PRD 12.2) */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-text flex items-center gap-1.5">
              <History className="size-4 text-primary" />
              Aktivitas Audit Terbaru
            </CardTitle>
            <Link href="/audit-log" className="text-xs text-primary hover:underline">
              Semua
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            {auditTerbaru.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">Belum ada aktivitas audit</p>
            ) : (
              auditTerbaru.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-2 border-b border-border/50 pb-2 text-xs last:border-0 last:pb-0">
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text">{log.pelaku_nama}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        {log.aksi}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {log.tabel} {log.alasan ? `· ${log.alasan}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-text-muted shrink-0 font-mono">
                    {tanggal(log.waktu).split(" ").slice(0, 2).join(" ")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
