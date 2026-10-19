import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bike,
  CheckCircle2,
  DollarSign,
  Plus,
  Receipt,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { rupiah } from "@/lib/format";
import { GrafikWoStatus } from "./GrafikWoStatus";

export type AdminDashboardProps = {
  ringkasan: {
    mobil_masuk_hari_ini: number;
    siap_diambil: number;
    perlu_ditagih: number;
    pendapatan_hari_ini: number;
    pendapatan: number;
    pendapatan_sebelumnya: number;
  };
  pendapatanHarian: Array<{ tanggal: string; pendapatan_jasa: number; pendapatan_part: number }>;
  woStatus: Array<{ status: string; jumlah: number }>;
  woPerluDitagih: Array<{
    id: string;
    nomor: string;
    plat: string;
    pelanggan: string;
    status: string;
    invoice_nomor?: string;
    invoice_status?: string;
  }>;
  stokMenipis: Array<{
    id: string;
    kode: string;
    nama: string;
    stok: number;
    stok_minimum: number;
  }>;
};

export function DashboardAdmin({
  ringkasan,
  woStatus,
  woPerluDitagih,
  stokMenipis,
}: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      {/* 1. Baris Aksi Cepat (PRD 12.3: Tombol + Work Order dan Kolom Cari Plat) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
        <form action="/work-orders" method="GET" className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
            <Input
              name="q"
              placeholder="Cari plat nomor motor (misal: B 1234 CD)..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 text-xs">
            Cari Plat
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Link href="/work-orders/baru">
            <Button size="sm" className="gap-1.5 h-9 text-xs font-semibold">
              <Plus className="size-4" />
              Work Order Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Kartu KPI (4 Kartu Sesuai PRD 12.3) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Motor Masuk Hari Ini */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">Motor Masuk Hari Ini</CardTitle>
            <Bike className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-text">
              {ringkasan.mobil_masuk_hari_ini || 0}
            </div>
            <p className="mt-1 text-xs text-text-muted">Unit motor baru terdaftar</p>
          </CardContent>
        </Card>

        {/* Siap Diambil */}
        <Link href="/work-orders?status=siap_diambil" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border bg-card hover:border-emerald-500/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-text-muted">Siap Diambil</CardTitle>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-emerald-600">
                {ringkasan.siap_diambil || 0}
              </div>
              <p className="mt-1 text-xs text-emerald-600 flex items-center">
                Buka daftar siap diambil <ArrowRight className="size-3 ml-1" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Perlu Ditagih */}
        <Card className={`border-border bg-card transition-colors ${ringkasan.perlu_ditagih > 0 ? "border-amber-400 bg-amber-50/20" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">Perlu Ditagih</CardTitle>
            <Receipt className={`size-4 ${ringkasan.perlu_ditagih > 0 ? "text-amber-500 animate-pulse" : "text-text-muted"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${ringkasan.perlu_ditagih > 0 ? "text-amber-600" : "text-text"}`}>
              {ringkasan.perlu_ditagih || 0}
            </div>
            <p className="mt-1 text-xs text-text-muted">WO selesai yang belum lunas</p>
          </CardContent>
        </Card>

        {/* Pendapatan Hari Ini */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">Pendapatan Hari Ini</CardTitle>
            <DollarSign className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-text">
              {rupiah(ringkasan.pendapatan_hari_ini || 0)}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Total periode: {rupiah(ringkasan.pendapatan || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Baris Grafik Status & Daftar Perlu Ditagih */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Seluruh Work Order */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-text">Work Order per Status</CardTitle>
              <p className="text-xs text-text-muted">Kondisi antrean motor saat ini</p>
            </div>
            <Link href="/work-orders" className="text-xs text-primary hover:underline">
              Semua WO
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <GrafikWoStatus data={woStatus} />
          </CardContent>
        </Card>

        {/* Daftar Perlu Ditagih / Siap Diserahkan (PRD 12.3) */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-text flex items-center gap-1.5">
                <AlertCircle className="size-4 text-amber-500" />
                Daftar Siap Diambil / Perlu Ditagih
              </CardTitle>
              <p className="text-xs text-text-muted">Motor lulus QC yang siap ditagih dan diserahkan</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {woPerluDitagih.length === 0 ? (
              <p className="text-xs text-text-muted py-8 text-center">
                Tidak ada motor yang menunggu penagihan atau serah terima
              </p>
            ) : (
              woPerluDitagih.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bg-app hover:bg-bg-panel transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text">{item.nomor}</span>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-text font-bold">
                        {item.plat}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">{item.pelanggan}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.invoice_status === "lunas" ? "outline" : "default"} className="text-[10px]">
                      {item.invoice_status === "lunas" ? "Lunas" : "Belum Lunas"}
                    </Badge>
                    <Link href={`/work-orders/${item.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        Buka
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Stok Menipis (PRD 12.3) */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-text flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-rose-500" />
              Peringatan Stok Menipis
            </CardTitle>
            <p className="text-xs text-text-muted">
              Spare part dengan jumlah sisa di bawah stok minimum
            </p>
          </div>
          <Link href="/inventory" className="text-xs text-primary hover:underline">
            Katalog Inventory
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {stokMenipis.length === 0 ? (
            <p className="text-xs text-emerald-600 py-6 text-center font-medium">
              Semua stok spare part aman (berada di atas batas minimum)
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stokMenipis.map((item) => {
                const persenSisa = Math.min(100, Math.round((item.stok / Math.max(1, item.stok_minimum)) * 100));
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-border bg-bg-app space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-text truncate">{item.nama}</span>
                      <span className="font-mono text-[10px] text-text-muted">{item.kode}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Sisa Stok:</span>
                      <span className="font-bold text-rose-600">
                        {item.stok} unit (Min: {item.stok_minimum})
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${persenSisa}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
