import Link from "next/link";
import { Plus, Search, AlertCircle } from "lucide-react";
import { BadgeStatus } from "@/components/BadgeStatus";
import { Paginasi } from "@/components/Paginasi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const PER_HALAMAN = 20;

const TAB_STATUS = [
  { id: "semua", label: "Semua" },
  { id: "menunggu", label: "Menunggu" },
  { id: "dikerjakan", label: "Dikerjakan" },
  { id: "tertunda", label: "Tertunda" },
  { id: "selesai", label: "Selesai" },
  { id: "siap_diambil", label: "Siap Diambil" },
  { id: "diambil", label: "Diambil" },
  { id: "dibatalkan", label: "Dibatalkan" },
] as const;

export default async function HalamanWorkOrders({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tim?: string; hal?: string }>;
}) {
  const { q = "", status = "semua", tim, hal } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);
  const cari = q.replace(/[,()*%\\]/g, " ").trim();

  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // Bila Kepala Mekanik: bawaannya disaring ke "Tim Saya" kecuali eksplisit memilih filter lain
  const filterTim = tim !== undefined ? tim : profil.peran === "kepala_mekanik" ? profil.id : "semua";

  // Ambil daftar kepala mekanik untuk opsi filter tim
  const { data: daftarTim } = await supabase
    .from("profiles")
    .select("id, nama")
    .eq("role", "kepala_mekanik")
    .eq("aktif", true)
    .order("nama");

  // Hitung jumlah WO per status untuk tab (dihitung sesuai filter tim jika ada)
  let kueriJumlah = supabase.from("work_orders").select("status");
  if (filterTim && filterTim !== "semua") {
    kueriJumlah = kueriJumlah.eq("kepala_mekanik_id", filterTim);
  }
  const { data: semuaStatus } = await kueriJumlah;
  const jumlahPerStatus = (semuaStatus ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    acc["semua"] = (acc["semua"] || 0) + 1;
    return acc;
  }, {});

  // Kueri utama: hanya kolom yang ditampilkan (hemat egress)
  let kueri = supabase
    .from("work_orders")
    .select(
      `
      id,
      nomor,
      status,
      estimasi_selesai,
      diskon,
      created_at,
      vehicles(plat),
      customers(nama),
      profiles:kepala_mekanik_id(nama),
      invoices(total),
      billing_items(jumlah, harga_dipakai)
    `,
      { count: "exact" }
    );

  // Filter Status
  if (status && status !== "semua") {
    kueri = kueri.eq("status", status);
  }

  // Filter Tim
  if (filterTim && filterTim !== "semua") {
    kueri = kueri.eq("kepala_mekanik_id", filterTim);
  }

  // Pencarian (nomor WO, plat, atau nama pelanggan)
  if (cari) {
    const [{ data: cocokPlat }, { data: cocokCust }] = await Promise.all([
      supabase.from("vehicles").select("id").ilike("plat", `%${cari}%`).limit(50),
      supabase.from("customers").select("id").ilike("nama", `%${cari}%`).limit(50),
    ]);

    const vehicleIds = (cocokPlat ?? []).map((v) => v.id);
    const customerIds = (cocokCust ?? []).map((c) => c.id);
    const syarat = [`nomor.ilike.%${cari}%`];
    if (vehicleIds.length) syarat.push(`vehicle_id.in.(${vehicleIds.join(",")})`);
    if (customerIds.length) syarat.push(`customer_id.in.(${customerIds.join(",")})`);
    kueri = kueri.or(syarat.join(","));
  }

  const { data: workOrders, count, error } = await kueri
    .order("created_at", { ascending: false })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

  const bolehBuat = profil.peran === "admin" || profil.peran === "owner";
  const hariIni = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Work Order
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Daftar seluruh pengerjaan kendaraan di Bengkel Cemerlang Jaya Motor
          </p>
        </div>
        {bolehBuat && (
          <Button asChild className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30">
            <Link href="/work-orders/baru">
              <Plus className="mr-1.5 size-4" />
              Work Order Baru
            </Link>
          </Button>
        )}
      </div>

      {/* Tab Status */}
      <div className="flex overflow-x-auto border-b border-zinc-800/80 pb-px scrollbar-none">
        <nav className="flex gap-2" aria-label="Status Work Order">
          {TAB_STATUS.map((tab) => {
            const aktif = status === tab.id;
            const jumlah = jumlahPerStatus[tab.id] ?? 0;
            return (
              <Link
                key={tab.id}
                href={`/work-orders?status=${tab.id}&tim=${encodeURIComponent(filterTim)}&q=${encodeURIComponent(cari)}`}
                className={`whitespace-nowrap px-3.5 py-2 text-xs font-mono font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                  aktif
                    ? "border-[#FF2E75] text-[#FF2E75]"
                    : "border-transparent text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                    aktif ? "bg-[#FF2E75]/20 text-[#FF2E75]" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {jumlah}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Filter Bar: Pencarian & Penyaring Tim */}
      <form method="GET" action="/work-orders" className="flex flex-wrap items-center gap-3" role="search">
        <input type="hidden" name="status" value={status} />
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cari No WO, plat nomor, atau pelanggan..."
            aria-label="Cari Work Order"
            className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-[#FF2E75] focus-visible:ring-[#FF2E75]"
          />
        </div>

        <div className="w-52">
          <select
            name="tim"
            defaultValue={filterTim}
            className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-200 shadow-xs focus:border-[#FF2E75] focus:outline-none"
            aria-label="Pilih Tim"
          >
            <option value="semua">Semua Tim</option>
            {daftarTim?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama} {profil.id === t.id ? "(Tim Saya)" : ""}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          variant="outline"
          className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs gap-1.5 h-9"
        >
          <Search className="size-3.5 text-[#FF2E75]" />
          Terapkan
        </Button>
      </form>

      {/* Tabel Work Order */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-900/90 border-b border-zinc-800 hover:bg-zinc-900/90">
              <TableHead className="pl-4 text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">No WO</TableHead>
              <TableHead className="text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Plat</TableHead>
              <TableHead className="text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Pelanggan</TableHead>
              <TableHead className="text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Tim Mekanik</TableHead>
              <TableHead className="text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Estimasi Selesai</TableHead>
              <TableHead className="text-right text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Total Tagihan</TableHead>
              <TableHead className="pr-4 text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {error && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-10 text-center text-rose-400 font-mono">
                  Gagal memuat data Work Order. Silakan muat ulang halaman ini.
                </TableCell>
              </TableRow>
            )}
            {!error && workOrders?.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-10 text-center text-zinc-500 font-mono">
                  {cari ? `Tidak ada Work Order yang cocok dengan "${cari}".` : "Belum ada Work Order di kategori ini."}
                </TableCell>
              </TableRow>
            )}
            {workOrders?.map((wo) => {
              // Hitung total tagihan: prioritas invoices.total, jika belum terbit maka sum billing_items - diskon
              const subtotalItem = wo.billing_items?.reduce((acc, b) => acc + b.jumlah * Number(b.harga_dipakai), 0) ?? 0;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const totalInvoice = (Array.isArray(wo.invoices) ? (wo.invoices as any)[0]?.total : (wo.invoices as any)?.total);
              const totalTagihan = totalInvoice ?? Math.max(0, subtotalItem - Number(wo.diskon || 0));

              // Cek keterlambatan: jika belum selesai/diambil/batal dan tanggal estimasi sudah lewat
              const terlambat =
                Boolean(wo.estimasi_selesai && wo.estimasi_selesai < hariIni) &&
                !["selesai", "siap_diambil", "diambil", "dibatalkan"].includes(wo.status);

              return (
                <TableRow key={wo.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <TableCell className="pl-4 font-mono font-semibold">
                    <Link href={`/work-orders/${wo.id}`} className="text-[#FF2E75] hover:underline">
                      {wo.nomor}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-white tracking-wider">
                    {wo.vehicles?.plat ?? "-"}
                  </TableCell>
                  <TableCell className="text-zinc-200">
                    {wo.customers?.nama ?? "-"}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {wo.profiles?.nama ?? "-"}
                  </TableCell>
                  <TableCell className="font-mono text-zinc-300">
                    {wo.estimasi_selesai ? (
                      <span className="flex items-center gap-1.5">
                        {tanggal(wo.estimasi_selesai)}
                        {terlambat && (
                          <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-400 px-1.5 py-0 text-[10px] font-mono font-bold">
                            <AlertCircle className="size-3 mr-0.5" />
                            Terlambat
                          </Badge>
                        )}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-white">
                    {totalTagihan > 0 ? rupiah(Number(totalTagihan)) : "-"}
                  </TableCell>
                  <TableCell className="pr-4">
                    <BadgeStatus status={wo.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Paginasi
        halaman={halaman}
        totalBaris={count ?? 0}
        perHalaman={PER_HALAMAN}
        params={{ q: cari, status, tim: filterTim }}
      />
    </div>
  );
}
