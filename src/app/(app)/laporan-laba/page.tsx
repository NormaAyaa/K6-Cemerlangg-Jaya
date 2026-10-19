import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Calendar, DollarSign, FileSpreadsheet, Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const marginPersen = totalPendapatan > 0
    ? Math.round((totalLabaKotor / totalPendapatan) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Laporan Laba</h1>
          <p className="text-sm text-text-muted">
            Ringkasan pendapatan, harga modal spare part, dan margin keuntungan per Work Order.
          </p>
        </div>
      </div>

      {/* Form Filter Periode */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label htmlFor="input-dari" className="text-xs font-medium text-text-muted">
                Dari Tanggal
              </label>
              <div className="relative">
                <Input
                  id="input-dari"
                  name="dari"
                  type="date"
                  defaultValue={pDari}
                  className="w-40 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="input-sampai" className="text-xs font-medium text-text-muted">
                Sampai Tanggal
              </label>
              <div className="relative">
                <Input
                  id="input-sampai"
                  name="sampai"
                  type="date"
                  defaultValue={pSampai}
                  className="w-40 h-9 text-xs"
                />
              </div>
            </div>

            <Button type="submit" size="sm" className="h-9 gap-1.5 text-xs">
              <Calendar className="size-3.5" />
              Terapkan Periode
            </Button>

            {/* Tombol pintasan periode */}
            <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
              <Link
                href={`/laporan-laba?dari=${defaultDari}&sampai=${defaultSampai}`}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-bg-app transition-colors"
              >
                Bulan Ini
              </Link>
              <Link
                href={`/laporan-laba?dari=${tahun}-01-01&sampai=${tahun}-12-31`}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-bg-app transition-colors"
              >
                Tahun Ini
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Kartu Ringkasan KPI (PRD 6.12) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pendapatan */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">
              Total Pendapatan
            </CardTitle>
            <DollarSign className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">
              {rupiah(totalPendapatan)}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Dari {daftarLaba.length} Work Order selesai
            </p>
          </CardContent>
        </Card>

        {/* Modal Spare Part */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">
              Modal Spare Part
            </CardTitle>
            <Wallet className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">
              {rupiah(totalModal)}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Harga pengadaan spare part
            </p>
          </CardContent>
        </Card>

        {/* Laba Kotor */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">
              Laba Kotor
            </CardTitle>
            {totalLabaKotor >= 0 ? (
              <TrendingUp className="size-4 text-emerald-600" />
            ) : (
              <TrendingDown className="size-4 text-rose-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalLabaKotor >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {rupiah(totalLabaKotor)}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Pendapatan dikurangi modal
            </p>
          </CardContent>
        </Card>

        {/* Margin Keuntungan */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-muted">
              Margin Rata-rata
            </CardTitle>
            <Percent className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${marginPersen >= 0 ? "text-text" : "text-rose-600"}`}>
              {marginPersen}%
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Persentase laba dari pendapatan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Data Per Work Order */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold text-text">Rincian Per Work Order</CardTitle>
            <p className="text-xs text-text-muted">
              Periode {tanggal(pDari)} s/d {tanggal(pSampai)}
            </p>
          </div>
          <span className="text-xs text-text-muted">
            Total {daftarLaba.length} baris
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center text-rose-600 text-sm">
              Gagal memuat data laporan laba: {error.message}
            </div>
          ) : daftarLaba.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted">
              <FileSpreadsheet className="size-10 mb-3 opacity-40" />
              <p className="font-medium text-text">Belum ada data transaksi</p>
              <p className="text-xs mt-1">
                Tidak ada invoice yang diterbitkan pada rentang tanggal {pDari} sampai {pSampai}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[120px]">No. WO</TableHead>
                    <TableHead className="w-[130px]">No. Invoice</TableHead>
                    <TableHead className="w-[110px]">Tanggal</TableHead>
                    <TableHead className="w-[110px]">Plat Motor</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                    <TableHead className="text-right">Modal Part</TableHead>
                    <TableHead className="text-right">Laba</TableHead>
                    <TableHead className="text-right w-[90px]">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daftarLaba.map((row) => {
                    const labaMinus = (row.laba || 0) < 0;
                    return (
                      <TableRow
                        key={row.work_order_id}
                        className={`border-border ${labaMinus ? "bg-rose-50/60 dark:bg-rose-950/20" : ""}`}
                      >
                        <TableCell className="font-medium">
                          <Link
                            href={`/work-orders/${row.work_order_id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {row.nomor_wo}
                            <ArrowUpRight className="size-3" />
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-text-muted">
                          {row.nomor_invoice || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-text-muted">
                          {tanggal(row.tanggal)}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-text">
                          {row.plat}
                        </TableCell>
                        <TableCell className="text-right font-medium text-text">
                          {rupiah(row.pendapatan || 0)}
                        </TableCell>
                        <TableCell className="text-right text-text-muted">
                          {rupiah(row.modal || 0)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            labaMinus ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {rupiah(row.laba || 0)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-xs font-semibold ${
                            labaMinus ? "text-rose-600 dark:text-rose-400" : "text-text"
                          }`}
                        >
                          {row.margin_persen}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
