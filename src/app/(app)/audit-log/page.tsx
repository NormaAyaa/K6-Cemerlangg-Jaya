import { redirect } from "next/navigation";
import Link from "next/link";
import { Filter, History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Audit Log
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Rekam jejak perubahan data status, harga, stok, invoice, dan profil akun (kekal & tidak dapat diubah)
          </p>
        </div>
      </div>

      {/* Form Penyaring Tabel, Pelaku, dan Aksi */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-4 sm:p-5 shadow-sm">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          {/* Filter Tabel */}
          <div className="space-y-1.5">
            <label htmlFor="filter-tabel" className="text-xs font-medium text-zinc-400">
              Tabel / Entitas
            </label>
            <select
              id="filter-tabel"
              name="tabel"
              defaultValue={tabel || ""}
              className="h-9 w-44 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
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
            <label htmlFor="filter-pelaku" className="text-xs font-medium text-zinc-400">
              Pelaku Perubahan
            </label>
            <select
              id="filter-pelaku"
              name="pelaku"
              defaultValue={pelaku || ""}
              className="h-9 w-48 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
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
            <label htmlFor="filter-aksi" className="text-xs font-medium text-zinc-400">
              Jenis Aksi
            </label>
            <select
              id="filter-aksi"
              name="aksi"
              defaultValue={aksi || ""}
              className="h-9 w-36 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">Semua Aksi</option>
              <option value="INSERT">INSERT (Tambah)</option>
              <option value="UPDATE">UPDATE (Ubah)</option>
              <option value="DELETE">DELETE (Hapus)</option>
            </select>
          </div>

          <Button
            type="submit"
            size="sm"
            className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary-strong text-white font-medium shadow-xs"
          >
            <Filter className="size-3.5" />
            Saring
          </Button>

          {(tabel || pelaku || aksi) && (
            <Link
              href="/audit-log"
              className="inline-flex items-center gap-1.5 text-xs h-9 px-3 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Link>
          )}
        </form>
      </div>

      {/* Tabel Audit Log */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white">Riwayat Audit</h3>
          <span className="font-mono text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
            Menampilkan {daftarLog.length} dari {totalBaris} entri log
          </span>
        </div>

        <div>
          {error ? (
            <div className="p-8 text-center text-rose-400 text-xs font-mono">
              Gagal memuat audit log: {error.message}
            </div>
          ) : daftarLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
              <History className="size-10 mb-3 opacity-40 text-zinc-400" />
              <p className="font-medium text-white text-xs">Belum ada aktivitas audit</p>
              <p className="text-[11px] mt-1 text-zinc-400">
                Tidak ada riwayat perubahan data yang sesuai dengan penyaring yang dipilih.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
                <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
                  <TableHead className="w-[170px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">Waktu</TableHead>
                  <TableHead className="w-[180px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">Pelaku</TableHead>
                  <TableHead className="w-[100px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">Aksi</TableHead>
                  <TableHead className="w-[150px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">Tabel / Entitas</TableHead>
                  <TableHead className="w-[140px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">ID Data</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Alasan / Keterangan</TableHead>
                  <TableHead className="text-right w-[110px] text-zinc-400 font-semibold text-xs uppercase tracking-wider">Nilai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-800/60">
                {daftarLog.map((log) => {
                  const pelakuNama = log.pelaku_id
                    ? profilMap.get(log.pelaku_id) ?? "Pengguna"
                    : "Sistem";

                  let badgeAksi = (
                    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-300">
                      {log.aksi}
                    </span>
                  );
                  if (log.aksi === "INSERT") {
                    badgeAksi = (
                      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                        INSERT
                      </span>
                    );
                  } else if (log.aksi === "UPDATE") {
                    badgeAksi = (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">
                        UPDATE
                      </span>
                    );
                  } else if (log.aksi === "DELETE") {
                    badgeAksi = (
                      <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-400">
                        DELETE
                      </span>
                    );
                  }

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
                    <TableRow key={log.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                      <TableCell className="text-xs text-zinc-400 font-mono">
                        {fmtWaktu.format(new Date(log.waktu))}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-white">{pelakuNama}</div>
                        <div className="text-[11px] text-zinc-500 capitalize">
                          {log.pelaku_peran ? log.pelaku_peran.replace("_", " ") : "Sistem"}
                        </div>
                      </TableCell>
                      <TableCell>{badgeAksi}</TableCell>
                      <TableCell className="text-xs font-medium text-white">
                        <div>{LABEL_TABEL[log.tabel] || log.tabel}</div>
                        <span className="font-mono text-[10px] text-pink-300">{log.tabel}</span>
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs text-zinc-400 truncate max-w-[140px]"
                        title={log.data_id || ""}
                      >
                        {log.data_id || "-"}
                      </TableCell>
                      <TableCell
                        className="text-xs text-zinc-300 italic max-w-[200px] truncate"
                        title={log.alasan || ""}
                      >
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
          )}

          {/* Paginasi 20 baris per halaman */}
          {totalBaris > PER_HALAMAN && (
            <div className="p-4 border-t border-zinc-800/80">
              <Paginasi
                halaman={halaman}
                totalBaris={totalBaris}
                perHalaman={PER_HALAMAN}
                params={{ tabel, pelaku, aksi }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
