import { redirect } from "next/navigation";
import Link from "next/link";
import { Filter, History, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Paginasi } from "@/components/Paginasi";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { DialogDetailAudit, type AuditLogEntry } from "./DialogDetailAudit";

export const metadata = {
  title: "Audit Log | Cemerlang Jaya Motor",
};

const PER_HALAMAN = 20;

const LABEL_TABEL: Record<string, string> = {
  work_orders: "Work Order",
  billing_items: "Item Tagihan",
  billing_item_costs: "Modal Tagihan",
  inventory_items: "Item Inventory",
  inventory_costs: "Harga Modal",
  invoices: "Invoice",
  payments: "Pembayaran",
  stock_movements: "Mutasi Stok",
  profiles: "Pengguna",
};

const fmtWaktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Jakarta",
});

export default async function HalamanAuditLog({
  searchParams,
}: {
  searchParams: Promise<{ tabel?: string; pelaku?: string; aksi?: string; hal?: string }>;
}) {
  const profil = await ambilProfilSaya();

  // PRD 6.13 & PRD 16: Audit log hanya boleh diakses oleh Owner
  if (profil.peran !== "owner") {
    redirect("/dashboard");
  }

  const { tabel, pelaku, aksi, hal } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);

  const supabase = await createClient();

  // Ambil daftar pengguna untuk opsi penyaring pelaku
  const { data: daftarPengguna } = await supabase
    .from("profiles")
    .select("id, nama, email, role")
    .order("nama");

  const profilMap = new Map((daftarPengguna ?? []).map((p) => [p.id, p.nama]));

  // Bangun query audit log (hanya kolom yang ditampilkan / hemat egress)
  let kueri = supabase
    .from("audit_logs")
    .select("id, waktu, pelaku_id, pelaku_peran, aksi, tabel, data_id, sebelum, sesudah, alasan", {
      count: "exact",
    });

  if (tabel) {
    kueri = kueri.eq("tabel", tabel);
  }
  if (pelaku) {
    kueri = kueri.eq("pelaku_id", pelaku);
  }
  if (aksi) {
    kueri = kueri.eq("aksi", aksi);
  }

  const { data: logData, count, error } = await kueri
    .order("waktu", { ascending: false })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

  const daftarLog = logData ?? [];
  const totalBaris = count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Audit Log</h1>
          <p className="text-sm text-text-muted">
            Rekam jejak perubahan data status, harga, stok, invoice, dan profil akun (kekal & tidak dapat diubah).
          </p>
        </div>
      </div>

      {/* Form Penyaring Tabel, Pelaku, dan Aksi */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            {/* Filter Tabel */}
            <div className="space-y-1.5">
              <label htmlFor="filter-tabel" className="text-xs font-medium text-text-muted">
                Tabel / Entitas
              </label>
              <select
                id="filter-tabel"
                name="tabel"
                defaultValue={tabel || ""}
                className="h-9 w-44 rounded-md border border-border bg-bg-app px-2.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Semua Tabel</option>
                {Object.entries(LABEL_TABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label} ({key})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Pelaku */}
            <div className="space-y-1.5">
              <label htmlFor="filter-pelaku" className="text-xs font-medium text-text-muted">
                Pelaku Perubahan
              </label>
              <select
                id="filter-pelaku"
                name="pelaku"
                defaultValue={pelaku || ""}
                className="h-9 w-48 rounded-md border border-border bg-bg-app px-2.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Semua Pelaku</option>
                {(daftarPengguna ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Aksi */}
            <div className="space-y-1.5">
              <label htmlFor="filter-aksi" className="text-xs font-medium text-text-muted">
                Jenis Aksi
              </label>
              <select
                id="filter-aksi"
                name="aksi"
                defaultValue={aksi || ""}
                className="h-9 w-36 rounded-md border border-border bg-bg-app px-2.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Semua Aksi</option>
                <option value="INSERT">INSERT (Tambah)</option>
                <option value="UPDATE">UPDATE (Ubah)</option>
                <option value="DELETE">DELETE (Hapus)</option>
              </select>
            </div>

            <Button type="submit" size="sm" className="h-9 gap-1.5 text-xs">
              <Filter className="size-3.5" />
              Saring
            </Button>

            {(tabel || pelaku || aksi) && (
              <Link
                href="/audit-log"
                className="inline-flex items-center gap-1.5 text-xs h-9 px-3 rounded-md border border-border text-text-muted hover:text-text hover:bg-bg-app transition-colors"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Tabel Audit Log */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold text-text">Riwayat Audit</CardTitle>
          <span className="text-xs text-text-muted">
            Menampilkan {daftarLog.length} dari {totalBaris} entri log
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center text-rose-600 text-sm">
              Gagal memuat audit log: {error.message}
            </div>
          ) : daftarLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted">
              <History className="size-10 mb-3 opacity-40" />
              <p className="font-medium text-text">Belum ada aktivitas audit</p>
              <p className="text-xs mt-1">
                Tidak ada riwayat perubahan data yang sesuai dengan penyaring yang dipilih.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[170px]">Waktu</TableHead>
                    <TableHead className="w-[180px]">Pelaku</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                    <TableHead className="w-[150px]">Tabel / Entitas</TableHead>
                    <TableHead className="w-[140px]">ID Data</TableHead>
                    <TableHead>Alasan / Keterangan</TableHead>
                    <TableHead className="text-right w-[110px]">Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daftarLog.map((log) => {
                    const pelakuNama = log.pelaku_id
                      ? profilMap.get(log.pelaku_id) ?? "Pengguna"
                      : "Sistem";

                    const badgeVarian =
                      log.aksi === "INSERT"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                        : log.aksi === "UPDATE"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800";

                    const entriLog: AuditLogEntry = {
                      id: log.id,
                      waktu: log.waktu,
                      pelaku_id: log.pelaku_id,
                      pelaku_nama: pelakuNama,
                      pelaku_peran: log.pelaku_peran,
                      aksi: log.aksi,
                      tabel: log.tabel,
                      data_id: log.data_id,
                      sebelum: log.sebelum as Record<string, unknown> | null,
                      sesudah: log.sesudah as Record<string, unknown> | null,
                      alasan: log.alasan,
                    };

                    return (
                      <TableRow key={log.id} className="border-border">
                        <TableCell className="text-xs text-text font-mono">
                          {fmtWaktu.format(new Date(log.waktu))}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-text">{pelakuNama}</div>
                          <div className="text-[11px] text-text-muted capitalize">
                            {log.pelaku_peran ? log.pelaku_peran.replace("_", " ") : "Sistem"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold ${badgeVarian}`}>
                            {log.aksi}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-text">
                          <div>{LABEL_TABEL[log.tabel] || log.tabel}</div>
                          <span className="font-mono text-[10px] text-text-muted">{log.tabel}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-text-muted truncate max-w-[140px]" title={log.data_id || ""}>
                          {log.data_id || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-text-muted max-w-[200px] truncate" title={log.alasan || ""}>
                          {log.alasan || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DialogDetailAudit log={entriLog} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginasi 20 baris per halaman */}
          {totalBaris > PER_HALAMAN && (
            <div className="p-4 border-t border-border">
              <Paginasi
                halaman={halaman}
                totalBaris={totalBaris}
                perHalaman={PER_HALAMAN}
                params={{ tabel, pelaku, aksi }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
