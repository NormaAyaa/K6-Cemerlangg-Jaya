import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock,
  UserCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tanggal } from "@/lib/format";
import { GrafikBebanMekanik } from "./GrafikBebanMekanik";
import { GrafikWoSelesaiHarian } from "./GrafikWoSelesaiHarian";

export type MekanikDashboardProps = {
  ringkasan: {
    menunggu_ditugaskan: number;
    sedang_dikerjakan: number;
    menunggu_qc: number;
    terlambat: number;
    selesai_periode: number;
    selesai_sebelumnya: number;
  };
  bebanMekanik: Array<{ mekanik: string; tim: string; wo_aktif: number; wo_selesai: number }>;
  woSelesaiHarian: Array<{ tanggal: string; jumlah: number }>;
  antreanTim: Array<{
    id: string;
    nomor: string;
    plat: string;
    pelanggan: string;
    keluhan: string;
    status: string;
    estimasi_selesai: string | null;
    terlambat: boolean;
  }>;
};

const LABEL_STATUS: Record<string, string> = {
  menunggu: "Menunggu",
  dikerjakan: "Dikerjakan",
  tertunda: "Tertunda",
  selesai: "Selesai (QC)",
};

const WARNA_STATUS: Record<string, string> = {
  menunggu: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300",
  dikerjakan: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  tertunda: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  selesai: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
};

export function DashboardMekanik({
  ringkasan,
  bebanMekanik,
  woSelesaiHarian,
  antreanTim,
}: MekanikDashboardProps) {
  return (
    <div className="space-y-6">
      {/* 1. Baris Kartu KPI Tim (4 Kartu PRD 12.4) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Menunggu Ditugaskan */}
        <Link href="/work-orders?status=menunggu" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border bg-card hover:border-slate-400 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-text-muted">Menunggu Ditugaskan</CardTitle>
              <ClipboardList className="size-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-text">
                {ringkasan.menunggu_ditugaskan || 0}
              </div>
              <p className="mt-1 text-xs text-text-muted">Perlu penunjukan mekanik</p>
            </CardContent>
          </Card>
        </Link>

        {/* Sedang Dikerjakan */}
        <Link href="/work-orders?status=dikerjakan" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border bg-card hover:border-blue-500/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-text-muted">Sedang Dikerjakan</CardTitle>
              <Wrench className="size-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-blue-600">
                {ringkasan.sedang_dikerjakan || 0}
              </div>
              <p className="mt-1 text-xs text-text-muted">Aktif atau tertunda part</p>
            </CardContent>
          </Card>
        </Link>

        {/* Menunggu QC */}
        <Link href="/work-orders?status=selesai" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border bg-card hover:border-purple-500/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-text-muted">Menunggu QC</CardTitle>
              <UserCheck className="size-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-purple-600">
                {ringkasan.menunggu_qc || 0}
              </div>
              <p className="mt-1 text-xs text-text-muted">Siap diperiksa hasil kerja</p>
            </CardContent>
          </Card>
        </Link>

        {/* Terlambat */}
        <Card className={`border-border bg-card transition-colors ${ringkasan.terlambat > 0 ? "border-rose-300 bg-rose-50/20" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">Terlambat</CardTitle>
            <AlertTriangle className={`size-4 ${ringkasan.terlambat > 0 ? "text-rose-600 animate-pulse" : "text-text-muted"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${ringkasan.terlambat > 0 ? "text-rose-600" : "text-text"}`}>
              {ringkasan.terlambat || 0}
            </div>
            <p className="mt-1 text-xs text-text-muted">Melewati estimasi selesai</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Baris Grafik: Beban Mekanik Tim & Tren Selesai Harian */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Beban Mekanik di Tim Ini */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-text">Beban Kerja Tim</CardTitle>
              <p className="text-xs text-text-muted">Jumlah WO aktif dan selesai per mekanik</p>
            </div>
            <Link href="/mekanik" className="text-xs text-primary hover:underline">
              Kelola Tim
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <GrafikBebanMekanik data={bebanMekanik} />
          </CardContent>
        </Card>

        {/* WO Selesai per Hari */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-text">Motor Selesai per Hari</CardTitle>
              <p className="text-xs text-text-muted">Produktivitas pengerjaan tim di periode ini</p>
            </div>
            <span className="text-xs text-text-muted font-medium">
              Total {ringkasan.selesai_periode || 0} unit
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            <GrafikWoSelesaiHarian data={woSelesaiHarian} />
          </CardContent>
        </Card>
      </div>

      {/* 3. Antrean Pengerjaan Tim (PRD 12.4) */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Clock className="size-4 text-primary" />
              Antrean Pengerjaan Tim
            </CardTitle>
            <p className="text-xs text-text-muted">
              Daftar WO aktif tim diurutkan berdasarkan estimasi selesai terdekat
            </p>
          </div>
          <Link href="/work-orders" className="text-xs text-primary hover:underline">
            Semua WO Tim
          </Link>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-0">
          {antreanTim.length === 0 ? (
            <p className="text-xs text-text-muted py-8 text-center">
              Tidak ada antrean pekerjaan aktif saat ini di tim Anda
            </p>
          ) : (
            antreanTim.map((item) => (
              <div
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                  item.terlambat
                    ? "border-rose-300 bg-rose-50/30 dark:border-rose-900 dark:bg-rose-950/20"
                    : "border-border bg-bg-app hover:bg-bg-panel"
                }`}
              >
                <div className="space-y-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-text">{item.nomor}</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-text font-bold">
                      {item.plat}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${WARNA_STATUS[item.status] || ""}`}>
                      {LABEL_STATUS[item.status] || item.status}
                    </Badge>
                    {item.terlambat && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertTriangle className="size-2.5" /> Terlambat
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    <span className="font-medium text-text">{item.pelanggan}</span> · {item.keluhan}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="text-text-muted block text-[11px]">Estimasi Selesai</span>
                    <span className={`font-semibold ${item.terlambat ? "text-rose-600" : "text-text"}`}>
                      {item.estimasi_selesai ? tanggal(item.estimasi_selesai) : "Belum ditentukan"}
                    </span>
                  </div>
                  <Link href={`/work-orders/${item.id}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                      Pengerjaan <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
