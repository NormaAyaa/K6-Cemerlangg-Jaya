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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  const barisTampil = hanyaBerubah && log.aksi === "UPDATE"
    ? daftarKolom.filter((c) => c.berubah)
    : daftarKolom;

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Eye className="size-3.5" />
          Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="size-4 text-primary" />
            Audit Log #{log.id} · Perbandingan Nilai
          </DialogTitle>
        </DialogHeader>

        {/* Info Ringkasan Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-bg-app text-xs border border-border">
          <div>
            <span className="text-text-muted block">Aksi</span>
            <span className="font-semibold">{log.aksi}</span>
          </div>
          <div>
            <span className="text-text-muted block">Tabel / Entitas</span>
            <span className="font-semibold font-mono">{log.tabel}</span>
          </div>
          <div>
            <span className="text-text-muted block">Pelaku</span>
            <span className="font-semibold">{log.pelaku_nama} ({log.pelaku_peran || "Sistem"})</span>
          </div>
          <div>
            <span className="text-text-muted block">ID Data</span>
            <span className="font-mono text-text-muted truncate block">{log.data_id || "-"}</span>
          </div>
        </div>

        {log.alasan && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
            <span className="font-medium text-amber-700 dark:text-amber-400 block mb-0.5">Alasan / Catatan:</span>
            <p className="text-text">{log.alasan}</p>
          </div>
        )}

        {/* Kontrol Filter Kolom Berubah jika UPDATE */}
        {log.aksi === "UPDATE" && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-text-muted">
              {daftarKolom.filter((c) => c.berubah).length} dari {daftarKolom.length} kolom berubah
            </span>
            <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
              <input
                type="checkbox"
                checked={hanyaBerubah}
                onChange={(e) => setHanyaBerubah(e.target.checked)}
                className="rounded border-border size-3.5"
              />
              Hanya tampilkan kolom yang berubah
            </label>
          </div>
        )}

        {/* Tabel Komparasi Nilai Sebelum dan Sesudah */}
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-bg-app">
              <TableRow>
                <TableHead className="w-1/4 text-xs">Kolom</TableHead>
                {log.aksi !== "INSERT" && (
                  <TableHead className="w-[37.5%] text-xs">Nilai Sebelum</TableHead>
                )}
                {log.aksi !== "DELETE" && (
                  <TableHead className="w-[37.5%] text-xs">Nilai Sesudah</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {barisTampil.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-xs text-text-muted py-6">
                    Tidak ada perubahan nilai kolom yang tercatat.
                  </TableCell>
                </TableRow>
              ) : (
                barisTampil.map((item) => (
                  <TableRow
                    key={item.kolom}
                    className={`text-xs ${item.berubah && log.aksi === "UPDATE" ? "bg-amber-500/5 font-medium" : ""}`}
                  >
                    <TableCell className="font-mono text-text">
                      <div className="flex items-center gap-1.5">
                        {item.kolom}
                        {item.berubah && log.aksi === "UPDATE" && (
                          <span className="size-1.5 rounded-full bg-amber-500" title="Berubah" />
                        )}
                      </div>
                    </TableCell>

                    {log.aksi !== "INSERT" && (
                      <TableCell className={`font-mono break-all ${item.berubah ? "text-rose-600 dark:text-rose-400 bg-rose-500/5" : "text-text-muted"}`}>
                        {formatNilai(item.nilaiSebelum)}
                      </TableCell>
                    )}

                    {log.aksi !== "DELETE" && (
                      <TableCell className={`font-mono break-all ${item.berubah ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5" : "text-text-muted"}`}>
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
