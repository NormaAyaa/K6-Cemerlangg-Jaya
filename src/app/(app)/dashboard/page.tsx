import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { dapatkanRentangPeriode } from "@/lib/dashboard-dates";
import { PenyaringPeriode } from "./PenyaringPeriode";
import { DashboardOwner, type OwnerDashboardProps } from "./DashboardOwner";
import { DashboardAdmin, type AdminDashboardProps } from "./DashboardAdmin";
import { DashboardMekanik, type MekanikDashboardProps } from "./DashboardMekanik";

export const metadata = {
  title: "Dashboard | Cemerlang Jaya Motor",
};

export type DataRingkasan = OwnerDashboardProps["ringkasan"] &
  AdminDashboardProps["ringkasan"] &
  MekanikDashboardProps["ringkasan"] &
  Record<string, unknown>;

export default async function HalamanDashboard({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; dari?: string; sampai?: string }>;
}) {
  const profil = await ambilProfilSaya();
  const params = await searchParams;

  const { pDari, pSampai, kodePeriode } = dapatkanRentangPeriode(
    params.periode,
    params.dari,
    params.sampai
  );

  const supabase = await createClient();

  // 1. Ambil ringkasan KPI (PRD 9.3: dashboard_ringkasan otomatis menyesuaikan peran pengguna di database)
  const { data: ringkasanData } = await supabase.rpc("dashboard_ringkasan", {
    p_dari: pDari,
    p_sampai: pSampai,
  });

  const ringkasan = (ringkasanData ?? {}) as unknown as DataRingkasan;

  // Judul & subjudul sambutan berdasarkan peran
  const sapaanPeran =
    profil.peran === "owner"
      ? "Pemilik Bengkel (Owner)"
      : profil.peran === "admin"
      ? "Meja Depan & Kasir (Admin)"
      : "Kepala Mekanik";

  return (
    <div className="space-y-6">
      {/* Header Dashboard & Penyaring Periode Terpadu */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Selamat datang, <span className="font-semibold text-text">{profil.nama}</span> · {sapaanPeran}
          </p>
        </div>

        {/* Penyaring Periode (Hari Ini / 7 Hari / 30 Hari / Bulan Ini / Kustom) */}
        <PenyaringPeriode
          periodeAktif={kodePeriode}
          pDari={pDari}
          pSampai={pSampai}
        />
      </div>

      {/* Konten Dashboard Sesuai Peran (PRD 12.2, 12.3, 12.4) */}
      {profil.peran === "owner" && (
        <DashboardOwnerWrapper
          pDari={pDari}
          pSampai={pSampai}
          ringkasan={ringkasan}
        />
      )}

      {profil.peran === "admin" && (
        <DashboardAdminWrapper
          pDari={pDari}
          pSampai={pSampai}
          ringkasan={ringkasan}
        />
      )}

      {profil.peran === "kepala_mekanik" && (
        <DashboardMekanikWrapper
          pDari={pDari}
          pSampai={pSampai}
          ringkasan={ringkasan}
          kepalaMekanikId={profil.id}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Wrapper Pengambil Data: Owner (PRD 12.2)
// ----------------------------------------------------------------------
async function DashboardOwnerWrapper({
  pDari,
  pSampai,
  ringkasan,
}: {
  pDari: string;
  pSampai: string;
  ringkasan: OwnerDashboardProps["ringkasan"];
}) {
  const supabase = await createClient();

  const [
    { data: labaHarian },
    { data: pendapatanHarian },
    { data: woStatus },
    { data: bebanMekanik },
    { data: topParts },
    { data: topJasa },
    { data: auditLogsRaw },
    { data: profilesRaw },
  ] = await Promise.all([
    supabase.rpc("dashboard_laba_harian", { p_dari: pDari, p_sampai: pSampai }),
    supabase.rpc("dashboard_pendapatan_harian", { p_dari: pDari, p_sampai: pSampai }),
    supabase.rpc("dashboard_wo_per_status", {}),
    supabase.rpc("dashboard_beban_mekanik", { p_dari: pDari, p_sampai: pSampai }),
    supabase.rpc("dashboard_top_item", { p_dari: pDari, p_sampai: pSampai, p_jenis: "part" }),
    supabase.rpc("dashboard_top_item", { p_dari: pDari, p_sampai: pSampai, p_jenis: "jasa" }),
    supabase
      .from("audit_logs")
      .select("id, waktu, pelaku_id, pelaku_peran, aksi, tabel, alasan")
      .order("waktu", { ascending: false })
      .limit(8),
    supabase.from("profiles").select("id, nama"),
  ]);

  const profilMap = new Map((profilesRaw ?? []).map((p) => [p.id, p.nama]));

  const auditTerbaru = (auditLogsRaw ?? []).map((log) => ({
    ...log,
    pelaku_nama: log.pelaku_id ? profilMap.get(log.pelaku_id) ?? "Pengguna" : "Sistem",
  }));

  return (
    <DashboardOwner
      ringkasan={ringkasan}
      labaHarian={labaHarian ?? []}
      pendapatanHarian={pendapatanHarian ?? []}
      woStatus={woStatus ?? []}
      bebanMekanik={bebanMekanik ?? []}
      topParts={topParts ?? []}
      topJasa={topJasa ?? []}
      auditTerbaru={auditTerbaru}
    />
  );
}

// ----------------------------------------------------------------------
// Wrapper Pengambil Data: Admin (PRD 12.3)
// ----------------------------------------------------------------------
async function DashboardAdminWrapper({
  pDari,
  pSampai,
  ringkasan,
}: {
  pDari: string;
  pSampai: string;
  ringkasan: AdminDashboardProps["ringkasan"];
}) {
  const supabase = await createClient();

  const [
    { data: pendapatanHarian },
    { data: woStatus },
    { data: woPerluDitagihRaw },
    { data: stokMenipisRaw },
  ] = await Promise.all([
    supabase.rpc("dashboard_pendapatan_harian", { p_dari: pDari, p_sampai: pSampai }),
    supabase.rpc("dashboard_wo_per_status", {}),
    supabase
      .from("work_orders")
      .select("id, nomor, status, vehicles(plat), customers(nama), invoices(nomor, status_bayar)")
      .in("status", ["siap_diambil"])
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("inventory_items")
      .select("id, kode, nama, stok, stok_minimum")
      .eq("jenis", "part")
      .eq("aktif", true)
      .order("stok", { ascending: true })
      .limit(20),
  ]);

  const woPerluDitagih = (woPerluDitagihRaw ?? []).map((item) => {
    const v = item.vehicles as { plat?: string } | null;
    const c = item.customers as { nama?: string } | null;
    const invs = item.invoices as Array<{ nomor?: string; status_bayar?: string }> | null;
    return {
      id: item.id,
      nomor: item.nomor,
      plat: v?.plat || "-",
      pelanggan: c?.nama || "-",
      status: item.status,
      invoice_nomor: invs?.[0]?.nomor,
      invoice_status: invs?.[0]?.status_bayar || "belum_terbit",
    };
  });

  const stokMenipis = (stokMenipisRaw ?? [])
    .filter((item) => item.stok <= item.stok_minimum)
    .slice(0, 6);

  return (
    <DashboardAdmin
      ringkasan={ringkasan}
      pendapatanHarian={pendapatanHarian ?? []}
      woStatus={woStatus ?? []}
      woPerluDitagih={woPerluDitagih}
      stokMenipis={stokMenipis}
    />
  );
}

// ----------------------------------------------------------------------
// Wrapper Pengambil Data: Kepala Mekanik (PRD 12.4)
// ----------------------------------------------------------------------
async function DashboardMekanikWrapper({
  pDari,
  pSampai,
  ringkasan,
  kepalaMekanikId,
}: {
  pDari: string;
  pSampai: string;
  ringkasan: MekanikDashboardProps["ringkasan"];
  kepalaMekanikId: string;
}) {
  const supabase = await createClient();
  const hariIni = new Date().toISOString().split("T")[0];

  const [
    { data: bebanMekanik },
    { data: woSelesaiHarian },
    { data: antreanRaw },
  ] = await Promise.all([
    supabase.rpc("dashboard_beban_mekanik", { p_dari: pDari, p_sampai: pSampai }),
    supabase.rpc("dashboard_wo_selesai_harian", { p_dari: pDari, p_sampai: pSampai }),
    supabase
      .from("work_orders")
      .select("id, nomor, status, keluhan, estimasi_selesai, vehicles(plat), customers(nama)")
      .eq("kepala_mekanik_id", kepalaMekanikId)
      .in("status", ["menunggu", "dikerjakan", "tertunda", "selesai"])
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const antreanTim = (antreanRaw ?? []).map((item) => {
    const v = item.vehicles as { plat?: string } | null;
    const c = item.customers as { nama?: string } | null;
    const terlambat =
      Boolean(item.estimasi_selesai && item.estimasi_selesai < hariIni) &&
      (item.status === "dikerjakan" || item.status === "tertunda");

    return {
      id: item.id,
      nomor: item.nomor,
      plat: v?.plat || "-",
      pelanggan: c?.nama || "-",
      keluhan: item.keluhan,
      status: item.status,
      estimasi_selesai: item.estimasi_selesai,
      terlambat,
    };
  });

  return (
    <DashboardMekanik
      ringkasan={ringkasan}
      bebanMekanik={bebanMekanik ?? []}
      woSelesaiHarian={woSelesaiHarian ?? []}
      antreanTim={antreanTim}
    />
  );
}
