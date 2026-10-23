import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Calendar,
  Coins,
  FileSpreadsheet,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rupiah, tanggal } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Laporan Laba | Cemerlang Jaya Motor",
};

export default async function HalamanLaporanLaba({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string }>;
}) {
  const profil = await ambilProfilSaya();

  // PRD 6.12 & PRD 16: Halaman ini hanya boleh diakses oleh Owner
  if (profil.peran !== "owner") {
    redirect("/dashboard");
  }

  const { dari, sampai } = await searchParams;

  // Tanggal default: Bulan ini (1 s/d hari terakhir bulan berjalan)
  const sekarang = new Date();
  const tahun = sekarang.getFullYear();
  const bulan = String(sekarang.getMonth() + 1).padStart(2, "0");
  const hariTerakhir = new Date(tahun, sekarang.getMonth() + 1, 0).getDate();

  const defaultDari = `${tahun}-${bulan}-01`;
  const defaultSampai = `${tahun}-${bulan}-${String(hariTerakhir).padStart(2, "0")}`;

  const pDari = dari || defaultDari;
  const pSampai = sampai || defaultSampai;

  const supabase = await createClient();

  // Panggil fungsi database laporan_laba(p_dari, p_sampai)
  const { data: barisLaba, error } = await supabase.rpc("laporan_laba", {
    p_dari: pDari,
    p_sampai: pSampai,
  });

  const daftarLaba = barisLaba ?? [];

  // Hitung total ringkasan dari hasil RPC
  const totalPendapatan = daftarLaba.reduce((acc, row) => acc + (row.pendapatan || 0), 0);
  const totalModal = daftarLaba.reduce((acc, row) => acc + (row.modal || 0), 0);
  const totalLabaKotor = daftarLaba.reduce((acc, row) => acc + (row.laba || 0), 0);
  const marginPersen =
    totalPendapatan > 0
      ? Math.round((totalLabaKotor / totalPendapatan) * 1000) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Laporan Laba
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Ringkasan pendapatan, harga modal spare part, dan margin laba bersih per Work Order
          </p>
        </div>
      </div>

      {/* Form Filter Periode */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-4 sm:p-5 shadow-sm">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="input-dari" className="text-xs font-medium text-zinc-400">
              Dari Tanggal
            </label>
            <Input
              id="input-dari"
              name="dari"
              type="date"
              defaultValue={pDari}
              className="w-40 h-9 text-xs border-zinc-800 bg-zinc-900 text-white focus-visible:border-primary/50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="input-sampai" className="text-xs font-medium text-zinc-400">
              Sampai Tanggal
            </label>
            <Input
              id="input-sampai"
              name="sampai"
              type="date"
              defaultValue={pSampai}
              className="w-40 h-9 text-xs border-zinc-800 bg-zinc-900 text-white focus-visible:border-primary/50"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary-strong text-white font-medium shadow-xs"
          >
            <Calendar className="size-3.5" />
            Terapkan Periode
          </Button>

          {/* Tombol pintasan periode */}
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <Link
              href={`/laporan-laba?dari=${defaultDari}&sampai=${defaultSampai}`}
              className="text-xs px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Bulan Ini
            </Link>
            <Link
              href={`/laporan-laba?dari=${tahun}-01-01&sampai=${tahun}-12-31`}
              className="text-xs px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Tahun Ini
            </Link>
          </div>
        </form>
      </div>

      {/* Kartu Ringkasan KPI (PRD 6.12) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pendapatan */}
        <div className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-[#111116] p-4 sm:p-5 transition-all duration-200 hover:border-primary/40 hover:bg-[#14141c] hover:shadow-[0_0_16px_rgba(255,46,117,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Pendapatan</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Coins className="size-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums">
              {rupiah(totalPendapatan)}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Dari {daftarLaba.length} Work Order selesai
            </p>
          </div>
        </div>

        {/* Modal Spare Part */}
        <div className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-[#111116] p-4 sm:p-5 transition-all duration-200 hover:border-amber-700/60 hover:bg-[#14141c] hover:shadow-[0_0_16px_rgba(245,158,11,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Modal Spare Part</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-950/40 text-amber-400">
              <Wallet className="size-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums">
              {rupiah(totalModal)}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Total harga modal pengadaan
            </p>
          </div>
        </div>

        {/* Laba Kotor */}
        <div className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-[#111116] p-4 sm:p-5 transition-all duration-200 hover:border-emerald-700/60 hover:bg-[#14141c] hover:shadow-[0_0_16px_rgba(16,185,129,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Laba Kotor</span>
            <div
              className={`flex size-7 items-center justify-center rounded-lg ${
                totalLabaKotor >= 0
                  ? "bg-emerald-950/40 text-emerald-400"
                  : "bg-rose-950/40 text-rose-400"
              }`}
            >
              {totalLabaKotor >= 0 ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${
                totalLabaKotor >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {rupiah(totalLabaKotor)}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Pendapatan dikurangi harga modal
            </p>
          </div>
        </div>

        {/* Margin Keuntungan */}
        <div className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-[#111116] p-4 sm:p-5 transition-all duration-200 hover:border-pink-700/60 hover:bg-[#14141c] hover:shadow-[0_0_16px_rgba(255,46,117,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Margin Rata-rata</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-pink-950/40 text-pink-300">
              <Percent className="size-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${
                marginPersen >= 0 ? "text-white" : "text-rose-400"
              }`}
            >
              {marginPersen}%
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Rasio laba kotor terhadap pendapatan
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Data Per Work Order */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Rincian Per Work Order</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Periode {tanggal(pDari)} s/d {tanggal(pSampai)}
            </p>
          </div>
          <span className="font-mono text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
            Total {daftarLaba.length} baris
          </span>
        </div>

        <div>
          {error ? (
            <div className="p-8 text-center text-rose-400 text-xs font-mono">
              Gagal memuat data laporan laba: {error.message}
            </div>
          ) : daftarLaba.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
              <FileSpreadsheet className="size-10 mb-3 opacity-40 text-zinc-400" />
              <p className="font-medium text-white text-xs">Belum ada data transaksi</p>
              <p className="text-[11px] mt-1 text-zinc-400">
                Tidak ada invoice yang diterbitkan pada rentang tanggal {pDari} sampai {pSampai}.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
                <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
                  <TableHead className="w-[130px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">No. WO</TableHead>
                  <TableHead className="w-[140px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">No. Invoice</TableHead>
                  <TableHead className="w-[120px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">Tanggal</TableHead>
                  <TableHead className="w-[120px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">Plat Kendaraan</TableHead>
                  <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Pendapatan</TableHead>
                  <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Modal Part</TableHead>
                  <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Laba</TableHead>
                  <TableHead className="text-right w-[90px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-800/60">
                {daftarLaba.map((row) => {
                  const labaMinus = (row.laba || 0) < 0;
                  return (
                    <TableRow
                      key={row.work_order_id}
                      className={`border-b border-zinc-800/60 transition-colors ${
                        labaMinus
                          ? "bg-rose-950/20 hover:bg-rose-950/30"
                          : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/work-orders/${row.work_order_id}`}
                          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {row.nomor_wo}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-400">
                        {row.nomor_invoice || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        {tanggal(row.tanggal)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {row.plat}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-zinc-200">
                        {rupiah(row.pendapatan || 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-400">
                        {rupiah(row.modal || 0)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-bold ${
                          labaMinus ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {rupiah(row.laba || 0)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums text-xs font-bold ${
                          labaMinus ? "text-rose-400" : "text-white"
                        }`}
                      >
                        {row.margin_persen}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
