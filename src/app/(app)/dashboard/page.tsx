import Link from "next/link";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Percent,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rupiah, tanggal } from "@/lib/format";
import { LABEL_PERAN } from "@/lib/peran";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FilterPeriode } from "./FilterPeriode";
import { GrafikPendapatan } from "./GrafikPendapatan";
import { GrafikStatusWo } from "./GrafikStatusWo";
import { KartuKpi } from "./KartuKpi";
import { PanelAktivitas } from "./PanelAktivitas";
import { PanelPerhatian } from "./PanelPerhatian";

function hitungRentang(periode: string) {
  const sekarang = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
  const hariIniStr = fmt.format(sekarang);
  const [thn, bln, tgl] = hariIniStr.split("-").map(Number);
  const hariIni = new Date(Date.UTC(thn, bln - 1, tgl));

  let dari: Date;
  if (periode === "hari_ini") {
    dari = hariIni;
  } else if (periode === "30h") {
    dari = new Date(hariIni);
    dari.setUTCDate(dari.getUTCDate() - 29);
  } else if (periode === "bulan_ini") {
    dari = new Date(Date.UTC(thn, bln - 1, 1));
  } else {
    // default 7 hari
    dari = new Date(hariIni);
    dari.setUTCDate(dari.getUTCDate() - 6);
  }

  return {
    p_dari: fmt.format(dari),
    p_sampai: hariIniStr,
    hariIniStr,
  };
}

function hitungPersen(sekarang: number, sebelumnya: number): number | null {
  if (sebelumnya === 0) return sekarang > 0 ? 100 : null;
  const delta = ((sekarang - sebelumnya) / sebelumnya) * 100;
  return Math.round(delta * 10) / 10;
}

type Props = {
  searchParams: Promise<{ periode?: string }>;
};

type RingkasanData = {
  pendapatan?: number;
  pendapatan_sebelumnya?: number;
  laba_kotor?: number;
  laba_kotor_sebelumnya?: number;
  margin_persen?: number;
  wo_aktif?: number;
  wo_terlambat?: number;
  piutang?: number;
  mobil_masuk_hari_ini?: number;
  siap_diambil?: number;
  perlu_ditagih?: number;
  pendapatan_hari_ini?: number;
  menunggu_ditugaskan?: number;
  sedang_dikerjakan?: number;
  menunggu_qc?: number;
  terlambat?: number;
  selesai_periode?: number;
  selesai_sebelumnya?: number;
  peran?: string;
  lama_hari?: number;
};

export default async function HalamanDashboard({ searchParams }: Props) {
  const { periode = "7h" } = await searchParams;
  const { p_dari, p_sampai, hariIniStr } = hitungRentang(periode);

  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // 1. Ambil ringkasan KPI dari database function
  const { data: ringkasanRaw } = await supabase.rpc("dashboard_ringkasan", {
    p_dari,
    p_sampai,
  });
  const ringkasan = (ringkasanRaw as RingkasanData) ?? {};

  // 2. Ambil data status WO
  const { data: woStatusRaw } = await supabase.rpc("dashboard_wo_per_status", {});
  const woStatus = (woStatusRaw as { status: string; jumlah: number }[]) ?? [];

  // 3. Ambil data pendapatan harian (Owner & Admin)
  const isOwnerOrAdmin = profil.peran === "owner" || profil.peran === "admin";
  const { data: pendapatanHarianRaw } = isOwnerOrAdmin
    ? await supabase.rpc("dashboard_pendapatan_harian", { p_dari, p_sampai })
    : { data: null };
  const pendapatanHarian = pendapatanHarianRaw ?? [];

  // 4. Khusus Owner: data laba harian
  const labaHarianMap = new Map<string, number>();
  if (profil.peran === "owner") {
    const { data: labaRaw } = await supabase.rpc("dashboard_laba_harian", { p_dari, p_sampai });
    (labaRaw ?? []).forEach((item) => labaHarianMap.set(item.tanggal, item.laba));
  }

  // Gabungkan laba ke pendapatan harian bila Owner
  const dataPendapatanGabungan = pendapatanHarian.map((item) => ({
    ...item,
    laba: labaHarianMap.get(item.tanggal) ?? 0,
  }));

  // 5. Data Perhatian (WO Terlambat & Stok Menipis)
  const [{ data: woTerlambatRaw }, { data: stokMenipisRaw }] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, nomor, keluhan, estimasi_selesai, vehicles(plat, merek_model)")
      .in("status", ["dikerjakan", "tertunda"])
      .lt("estimasi_selesai", hariIniStr)
      .limit(6),
    supabase
      .from("inventory_items")
      .select("id, kode, nama, stok, stok_minimum")
      .eq("aktif", true)
      .eq("jenis", "part")
      .filter("stok", "lte", "stok_minimum")
      .limit(6),
  ]);

  const woTerlambat = (woTerlambatRaw ?? []) as {
    id: string;
    nomor: string;
    keluhan: string;
    estimasi_selesai: string | null;
    vehicles: { plat: string; merek_model: string } | null;
  }[];

  const stokMenipis = (stokMenipisRaw ?? []) as {
    id: string;
    kode: string;
    nama: string;
    stok: number;
    stok_minimum: number;
  }[];

  // 6. Data Audit Log (Khusus Owner)
  const { data: auditLogsRaw } =
    profil.peran === "owner"
      ? await supabase
          .from("audit_logs")
          .select("id, waktu, pelaku_peran, aksi, tabel, alasan")
          .order("waktu", { ascending: false })
          .limit(8)
      : { data: [] };
  const auditLogs = auditLogsRaw ?? [];

  // 7. Data Antrean WO Tim (Khusus Kepala Mekanik)
  const { data: antreanTimRaw } =
    profil.peran === "kepala_mekanik"
      ? await supabase
          .from("work_orders")
          .select("id, nomor, keluhan, status, estimasi_selesai, vehicles(plat, merek_model)")
          .eq("kepala_mekanik_id", profil.id)
          .in("status", ["menunggu", "dikerjakan", "tertunda", "selesai"])
          .order("estimasi_selesai", { ascending: true })
          .limit(8)
      : { data: [] };
  const antreanTim = antreanTimRaw ?? [];

  return (
    <div className="space-y-6">
      {/* Header Dashboard Bersih & Elegan */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Dashboard {LABEL_PERAN[profil.peran]}
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Ringkasan performa dan operasional bengkel secara real-time
          </p>
        </div>

        <FilterPeriode />
      </div>

      {/* ============================================================== */}
      {/* 1. DASHBOARD OWNER */}
      {/* ============================================================== */}
      {profil.peran === "owner" && (
        <>
          {/* 6 Kartu KPI */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <KartuKpi
              judul="Pendapatan"
              nilai={rupiah(ringkasan.pendapatan ?? 0)}
              perubahan={hitungPersen(ringkasan.pendapatan ?? 0, ringkasan.pendapatan_sebelumnya ?? 0)}
              ikon={TrendingUp}
            />
            <KartuKpi
              judul="Laba Kotor"
              nilai={rupiah(ringkasan.laba_kotor ?? 0)}
              perubahan={hitungPersen(ringkasan.laba_kotor ?? 0, ringkasan.laba_kotor_sebelumnya ?? 0)}
              ikon={Coins}
            />
            <KartuKpi
              judul="Margin Laba"
              nilai={`${ringkasan.margin_persen ?? 0}%`}
              subnilai="Rasio margin periode"
              ikon={Percent}
            />
            <KartuKpi
              judul="WO Aktif"
              nilai={String(ringkasan.wo_aktif ?? 0)}
              subnilai="Sedang berproses"
              href="/work-orders"
              ikon={Wrench}
            />
            <KartuKpi
              judul="WO Terlambat"
              nilai={String(ringkasan.wo_terlambat ?? 0)}
              bahaya={Boolean((ringkasan.wo_terlambat ?? 0) > 0)}
              href="/work-orders?status=tertunda"
              ikon={AlertTriangle}
            />
            <KartuKpi
              judul="Total Piutang"
              nilai={rupiah(ringkasan.piutang ?? 0)}
              peringatan={Boolean((ringkasan.piutang ?? 0) > 0)}
              subnilai="Invoice belum lunas"
              ikon={Receipt}
            />
          </div>

          {/* Tengah: Grafik Pendapatan & Status WO */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    Tren Pendapatan & Laba
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Pendapatan harian spare part vs jasa servis
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="size-2 rounded-full bg-[#FF2E75]" /> Spare Part
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="size-2 rounded-full bg-[#F43F5E]" /> Jasa Servis
                  </span>
                  <span className="flex items-center gap-1.5 text-pink-300 font-medium">
                    <span className="size-2 rounded-full bg-[#FDA4AF]" /> Laba Kotor
                  </span>
                </div>
              </div>
              <GrafikPendapatan data={dataPendapatanGabungan} tampilkanLaba={true} />
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm">
              <div className="border-b border-zinc-800/80 pb-3">
                <h3 className="font-semibold text-white text-sm">
                  Distribusi Status WO
                </h3>
                <p className="text-xs text-zinc-500">
                  Komposisi status pengerjaan saat ini
                </p>
              </div>
              <GrafikStatusWo data={woStatus} />
            </div>
          </div>

          {/* Bawah: Panel Perhatian & Linimasa Audit Log */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    Perlu Perhatian
                  </h3>
                  <p className="text-xs text-zinc-500">
                    WO terlambat dan stok spare part menipis
                  </p>
                </div>
                <span className="rounded bg-rose-950/50 border border-rose-900/40 px-2 py-0.5 text-[11px] font-medium text-rose-400">
                  Prioritas
                </span>
              </div>
              <div className="mt-4">
                <PanelPerhatian woTerlambat={woTerlambat} stokMenipis={stokMenipis} />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    Aktivitas Terbaru
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Log aktivitas audit terbaru
                  </p>
                </div>
                <Link
                  href="/audit-log"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Lihat Semua →
                </Link>
              </div>
              <div className="mt-4">
                <PanelAktivitas logs={auditLogs} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 2. DASHBOARD ADMIN */}
      {/* ============================================================== */}
      {profil.peran === "admin" && (
        <>
          {/* Baris Aksi Cepat: Tombol + Work Order & Cari Plat */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-[#111116] p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Link href="/work-orders/baru">
                <Button className="gap-2 bg-primary text-white font-medium hover:bg-primary-strong shadow-xs">
                  <Plus className="size-4" />
                  Work Order Baru
                </Button>
              </Link>
            </div>

            <form
              action="/work-orders"
              method="GET"
              className="flex w-full max-w-sm items-center gap-2"
              role="search"
            >
              <Input
                name="q"
                placeholder="Ketik plat nomor (cth. B 1234 ABC)..."
                className="text-xs uppercase border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
              />
              <Button type="submit" variant="outline" size="sm" className="gap-1.5 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                <Search className="size-3.5" />
                Cari
              </Button>
            </form>
          </div>

          {/* 4 Kartu KPI Admin */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KartuKpi
              judul="Mobil Masuk Hari Ini"
              nilai={String(ringkasan.mobil_masuk_hari_ini ?? 0)}
              subnilai="Kunjungan baru tercatat"
              ikon={Car}
            />
            <KartuKpi
              judul="Siap Diambil"
              nilai={String(ringkasan.siap_diambil ?? 0)}
              subnilai="Lulus QC bengkel"
              href="/work-orders?status=siap_diambil"
              ikon={CheckCircle2}
            />
            <KartuKpi
              judul="Perlu Ditagih"
              nilai={String(ringkasan.perlu_ditagih ?? 0)}
              peringatan={Boolean((ringkasan.perlu_ditagih ?? 0) > 0)}
              subnilai="Invoice belum lunas"
              href="/work-orders?status=siap_diambil"
              ikon={FileText}
            />
            <KartuKpi
              judul="Pendapatan Hari Ini"
              nilai={rupiah(ringkasan.pendapatan_hari_ini ?? 0)}
              subnilai="Penerimaan invoice hari ini"
              ikon={Wallet}
            />
          </div>

          {/* Tengah: Grafik Pendapatan & Status WO */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm lg:col-span-2">
              <div className="border-b border-zinc-800/80 pb-3">
                <h3 className="font-semibold text-white text-sm">
                  Pendapatan Operasional
                </h3>
                <p className="text-xs text-zinc-500">
                  Tren pendapatan harian bengkel
                </p>
              </div>
              <GrafikPendapatan data={dataPendapatanGabungan} tampilkanLaba={false} />
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm">
              <div className="border-b border-zinc-800/80 pb-3">
                <h3 className="font-semibold text-white text-sm">
                  Status Work Order
                </h3>
                <p className="text-xs text-zinc-500">
                  Workflow pengerjaan bengkel
                </p>
              </div>
              <GrafikStatusWo data={woStatus} />
            </div>
          </div>

          {/* Bawah: Perhatian & Stok Menipis */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm">
              <div className="border-b border-zinc-800/80 pb-3">
                <h3 className="font-semibold text-white text-sm">
                  Work Order Perlu Ditindaklanjuti
                </h3>
                <p className="text-xs text-zinc-500">
                  WO terlambat atau belum ditagih
                </p>
              </div>
              <div className="mt-4">
                <PanelPerhatian woTerlambat={woTerlambat} stokMenipis={[]} />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm">
              <div className="border-b border-zinc-800/80 pb-3">
                <h3 className="font-semibold text-white text-sm">
                  Peringatan Stok Spare Part Menipis
                </h3>
                <p className="text-xs text-zinc-500">
                  Stok di bawah batas minimum
                </p>
              </div>
              <div className="mt-4">
                <PanelPerhatian woTerlambat={[]} stokMenipis={stokMenipis} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 3. DASHBOARD KEPALA MEKANIK */}
      {/* ============================================================== */}
      {profil.peran === "kepala_mekanik" && (
        <>
          {/* 4 Kartu KPI Tim */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KartuKpi
              judul="Menunggu Ditugaskan"
              nilai={String(ringkasan.menunggu_ditugaskan ?? 0)}
              subnilai="Perlu penunjukan mekanik"
              href="/work-orders?status=menunggu"
              ikon={Clock}
            />
            <KartuKpi
              judul="Sedang Dikerjakan"
              nilai={String(ringkasan.sedang_dikerjakan ?? 0)}
              subnilai="Pengerjaan aktif tim"
              href="/work-orders?status=dikerjakan"
              ikon={Wrench}
            />
            <KartuKpi
              judul="Menunggu QC"
              nilai={String(ringkasan.menunggu_qc ?? 0)}
              peringatan={Boolean((ringkasan.menunggu_qc ?? 0) > 0)}
              subnilai="Selesai pengerjaan mekanik"
              href="/work-orders?status=selesai"
              ikon={ShieldAlert}
            />
            <KartuKpi
              judul="Terlambat (Tim)"
              nilai={String(ringkasan.terlambat ?? 0)}
              bahaya={Boolean((ringkasan.terlambat ?? 0) > 0)}
              href="/work-orders?status=dikerjakan"
              ikon={AlertTriangle}
            />
          </div>

          {/* Tengah: Antrean Tim & Pipeline Status */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    Antrean Pengerjaan Tim
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Daftar WO aktif yang ditangani tim
                  </p>
                </div>
                <Link
                  href="/work-orders"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Buka Daftar Penuh →
                </Link>
              </div>

              {antreanTim.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  Tidak ada antrean pengerjaan aktif saat ini.
                </div>
              ) : (
                <div className="mt-3 divide-y divide-zinc-800/80">
                  {antreanTim.map((wo) => (
                    <Link
                      key={wo.id}
                      href={`/work-orders/${wo.id}`}
                      className="group flex flex-col md:flex-row md:items-center justify-between gap-2 py-3 px-2 rounded-lg transition-colors hover:bg-zinc-800/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">
                            {wo.nomor}
                          </span>
                          <span className="font-mono text-xs font-medium text-white bg-zinc-800 px-1.5 py-0.5 rounded">
                            {wo.vehicles?.plat ?? "PLAT -"}
                          </span>
                          <span className="text-xs text-zinc-400 truncate">
                            {wo.vehicles?.merek_model}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-300">{wo.keluhan}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-zinc-400">
                          Est: {wo.estimasi_selesai ? tanggal(wo.estimasi_selesai) : "-"}
                        </span>
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300 uppercase">
                          {wo.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm">
              <div className="border-b border-zinc-800/80 pb-3">
                <h3 className="font-semibold text-white text-sm">
                  Komposisi Status Tim
                </h3>
                <p className="text-xs text-zinc-500">
                  Status WO tim saat ini
                </p>
              </div>
              <GrafikStatusWo data={woStatus} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
