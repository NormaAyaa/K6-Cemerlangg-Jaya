"use client";

import { useState } from "react";
import { Eye, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AuditLogEntry = {
  id: number;
  waktu: string;
  pelaku_id: string | null;
  pelaku_nama: string;
  pelaku_peran: string | null;
  aksi: string;
  tabel: string;
  data_id: string | null;
  sebelum: Record<string, unknown> | null;
  sesudah: Record<string, unknown> | null;
  alasan: string | null;
};

function formatNilai(val: unknown): string {
  if (val === null || val === undefined) return "- (null)";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function DialogDetailAudit({ log }: { log: AuditLogEntry }) {
  const [buka, setBuka] = useState(false);
  const [hanyaBerubah, setHanyaBerubah] = useState(true);

  // Kumpulkan semua keys dari sebelum dan sesudah
  const sebelumObj = (log.sebelum || {}) as Record<string, unknown>;
  const sesudahObj = (log.sesudah || {}) as Record<string, unknown>;
  const semuaKeys = Array.from(new Set([...Object.keys(sebelumObj), ...Object.keys(sesudahObj)])).sort();

  const daftarKolom = semuaKeys.map((k) => {
    const nilaiSebelum = sebelumObj[k];
    const nilaiSesudah = sesudahObj[k];
    const sama = JSON.stringify(nilaiSebelum) === JSON.stringify(nilaiSesudah);
    return {
      kolom: k,
      nilaiSebelum,
      nilaiSesudah,
      berubah: !sama,
    };
  });

  const barisTampil =
    hanyaBerubah && log.aksi === "UPDATE"
      ? daftarKolom.filter((c) => c.berubah)
      : daftarKolom;

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-primary/40"
        >
          <Eye className="size-3.5" />
          Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#111116] border border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <History className="size-4 text-primary" />
            Audit Log #{log.id} · Perbandingan Nilai
          </DialogTitle>
        </DialogHeader>

        {/* Info Ringkasan Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-zinc-900/80 text-xs border border-zinc-800">
          <div>
            <span className="text-zinc-400 block">Aksi</span>
            <span className="font-semibold text-white">{log.aksi}</span>
          </div>
          <div>
            <span className="text-zinc-400 block">Tabel / Entitas</span>
            <span className="font-semibold font-mono text-pink-300">{log.tabel}</span>
          </div>
          <div>
            <span className="text-zinc-400 block">Pelaku</span>
            <span className="font-semibold text-white">
              {log.pelaku_nama} ({log.pelaku_peran || "Sistem"})
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block">ID Data</span>
            <span className="font-mono text-zinc-400 truncate block">
              {log.data_id || "-"}
            </span>
          </div>
        </div>

        {log.alasan && (
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-xs">
            <span className="font-medium text-amber-400 block mb-0.5">
              Alasan / Catatan:
            </span>
            <p className="text-zinc-200">{log.alasan}</p>
          </div>
        )}

        {/* Kontrol Filter Kolom Berubah jika UPDATE */}
        {log.aksi === "UPDATE" && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-zinc-400">
              {daftarKolom.filter((c) => c.berubah).length} dari {daftarKolom.length} kolom berubah
            </span>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hanyaBerubah}
                onChange={(e) => setHanyaBerubah(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 size-3.5 accent-pink-600"
              />
              Hanya tampilkan kolom yang berubah
            </label>
          </div>
        )}

        {/* Tabel Komparasi Nilai Sebelum dan Sesudah */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-900/80 border-b border-zinc-800">
              <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                <TableHead className="w-1/4 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                  Kolom
                </TableHead>
                {log.aksi !== "INSERT" && (
                  <TableHead className="w-[37.5%] text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                    Nilai Sebelum
                  </TableHead>
                )}
                {log.aksi !== "DELETE" && (
                  <TableHead className="w-[37.5%] text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                    Nilai Sesudah
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-800/60">
              {barisTampil.length === 0 ? (
                <TableRow className="border-b border-zinc-800/60 hover:bg-transparent">
                  <TableCell
                    colSpan={3}
                    className="text-center text-xs text-zinc-500 py-6"
                  >
                    Tidak ada perubahan nilai kolom yang tercatat.
                  </TableCell>
                </TableRow>
              ) : (
                barisTampil.map((item) => (
                  <TableRow
                    key={item.kolom}
                    className={`text-xs border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors ${
                      item.berubah && log.aksi === "UPDATE"
                        ? "bg-amber-950/15 font-medium"
                        : ""
                    }`}
                  >
                    <TableCell className="font-mono text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        {item.kolom}
                        {item.berubah && log.aksi === "UPDATE" && (
                          <span
                            className="size-1.5 rounded-full bg-amber-400"
                            title="Berubah"
                          />
                        )}
                      </div>
                    </TableCell>

                    {log.aksi !== "INSERT" && (
                      <TableCell
                        className={`font-mono break-all ${
                          item.berubah
                            ? "text-rose-400 bg-rose-950/20"
                            : "text-zinc-500"
                        }`}
                      >
                        {formatNilai(item.nilaiSebelum)}
                      </TableCell>
                    )}

                    {log.aksi !== "DELETE" && (
                      <TableCell
                        className={`font-mono break-all ${
                          item.berubah
                            ? "text-emerald-400 bg-emerald-950/20"
                            : "text-zinc-500"
                        }`}
                      >
                        {formatNilai(item.nilaiSesudah)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
