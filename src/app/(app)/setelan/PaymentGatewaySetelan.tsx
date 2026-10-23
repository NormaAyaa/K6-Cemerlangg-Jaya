"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
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
import { tanggalWaktu } from "@/lib/format";

export interface WebhookLogItem {
  id: string;
  event: string | null;
  mayar_invoice_id: string | null;
  status: string;
  alasan: string | null;
  created_at: string;
}

interface Props {
  terhubung: boolean;
  hasMayarApiKey: boolean;
  hasSupabaseSecretKey: boolean;
  mode: string;
  baseUrl: string;
  webhookUrl: string;
  logs: WebhookLogItem[];
}

export function PaymentGatewaySetelan({
  terhubung,
  hasMayarApiKey,
  hasSupabaseSecretKey,
  mode,
  baseUrl,
  webhookUrl,
  logs,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success("URL Webhook berhasil disalin ke clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin URL Webhook");
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Data log webhook diperbarui");
    }, 500);
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <CreditCard className="size-5 text-[#FF2E75]" />
          <div>
            <h2 className="text-base font-semibold text-white">Payment Gateway (Mayar)</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Status integrasi pembayaran online Mayar, webhook callback, dan log transaksi. Khusus Owner.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              terhubung
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono text-xs gap-1.5 px-2.5 py-1"
                : "border-rose-500/20 bg-rose-500/10 text-rose-400 font-mono text-xs gap-1.5 px-2.5 py-1"
            }
          >
            {terhubung ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                Terhubung
              </>
            ) : (
              <>
                <XCircle className="size-3.5 text-rose-400" />
                Belum Terhubung
              </>
            )}
          </Badge>

          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-400 font-mono text-xs px-2.5 py-1">
            {mode}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Ringkasan Konfigurasi Server */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-1.5 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-400">
              <KeyRound className="size-3.5 text-[#FF2E75]" />
              <span>MAYAR_API_KEY</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {hasMayarApiKey ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 font-mono">
                  <Check className="size-3.5 text-emerald-400" />
                  Tersedia di Server
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 font-mono">
                  <XCircle className="size-3.5 text-rose-400" />
                  Belum Disetel
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">Nilai kunci dirahasiakan oleh server.</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-1.5 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-400">
              <ShieldCheck className="size-3.5 text-[#FF2E75]" />
              <span>SUPABASE_SECRET_KEY</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {hasSupabaseSecretKey ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 font-mono">
                  <Check className="size-3.5 text-emerald-400" />
                  Tersedia di Server
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 font-mono">
                  <XCircle className="size-3.5 text-rose-400" />
                  Belum Disetel
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">Untuk verifikasi webhook otomatis.</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-1.5 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-400">
              <ExternalLink className="size-3.5 text-[#FF2E75]" />
              <span>Endpoint Mayar</span>
            </div>
            <div className="pt-1">
              <span className="text-xs font-mono font-medium text-zinc-300 break-all">
                {baseUrl}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">Lingkungan pengujian Sandbox Mayar.</p>
          </div>
        </div>

        {/* URL Webhook yang Bisa Disalin */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
            URL Webhook Mayar
          </label>
          <div className="flex items-center gap-2 max-w-2xl">
            <Input
              readOnly
              value={webhookUrl}
              className="font-mono text-xs bg-zinc-900/80 border-zinc-800 text-zinc-200 selection:bg-[#FF2E75]/30 focus-visible:ring-0 focus-visible:border-zinc-700"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="gap-2 shrink-0 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="size-4 text-[#FF2E75]" />
                  Salin URL
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-400">
            Salin URL di atas dan pasang pada menu <span className="font-semibold text-white">Webhook</span> di Dashboard Mayar Sandbox Anda agar status pembayaran otomatis tercatat Lunas.
          </p>
        </div>

        {/* 10 Baris Terakhir mayar_webhook_log */}
        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                10 Baris Terakhir Log Webhook Mayar
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Riwayat pesan webhook yang diterima oleh sistem dari Mayar.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5 h-8 text-xs border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 hover:text-white"
            >
              <RefreshCw className={`size-3.5 text-[#FF2E75] ${refreshing ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>

          <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900/40">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-900/90 border-b border-zinc-800 hover:bg-zinc-900/90">
                  <TableHead className="w-40 text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Waktu</TableHead>
                  <TableHead className="w-36 text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Event</TableHead>
                  <TableHead className="w-44 text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">ID Invoice Mayar</TableHead>
                  <TableHead className="w-28 text-center text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Alasan / Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {logs.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-24 text-center text-zinc-500 font-mono">
                      Belum ada pesan webhook yang diterima dari Mayar.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        {tanggalWaktu(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                          {log.event || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-zinc-400">
                        {log.mayar_invoice_id || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                            log.status === "diterima"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-400 max-w-xs truncate font-mono text-[11px]" title={log.alasan || ""}>
                        {log.alasan || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
