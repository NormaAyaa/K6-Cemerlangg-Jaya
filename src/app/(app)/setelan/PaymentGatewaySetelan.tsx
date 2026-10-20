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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border-border">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              <CardTitle>Payment Gateway (Mayar)</CardTitle>
            </div>
            <CardDescription>
              Status integrasi pembayaran online Mayar, webhook callback, dan log transaksi. Khusus Owner.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                terhubung
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-rose-300 bg-rose-50 text-rose-800"
              }
            >
              {terhubung ? (
                <>
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Terhubung
                </>
              ) : (
                <>
                  <XCircle className="size-3 text-rose-600" />
                  Belum Terhubung
                </>
              )}
            </Badge>

            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              {mode}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ringkasan Konfigurasi Server */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-bg-app/50 p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
              <KeyRound className="size-3.5" />
              <span>MAYAR_API_KEY</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {hasMayarApiKey ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="size-3.5 text-emerald-600" />
                  Tersedia di Server
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                  <XCircle className="size-3.5 text-rose-600" />
                  Belum Disetel
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted">Nilai kunci dirahasiakan oleh server.</p>
          </div>

          <div className="rounded-lg border border-border bg-bg-app/50 p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
              <ShieldCheck className="size-3.5" />
              <span>SUPABASE_SECRET_KEY</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {hasSupabaseSecretKey ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="size-3.5 text-emerald-600" />
                  Tersedia di Server
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                  <XCircle className="size-3.5 text-rose-600" />
                  Belum Disetel
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted">Untuk verifikasi webhook otomatis.</p>
          </div>

          <div className="rounded-lg border border-border bg-bg-app/50 p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
              <ExternalLink className="size-3.5" />
              <span>Endpoint Mayar</span>
            </div>
            <div className="pt-1">
              <span className="text-xs font-mono font-medium text-text break-all">
                {baseUrl}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">Lingkungan pengujian Sandbox Mayar.</p>
          </div>
        </div>

        {/* URL Webhook yang Bisa Disalin */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-text">
            URL Webhook Mayar
          </label>
          <div className="flex items-center gap-2 max-w-2xl">
            <Input
              readOnly
              value={webhookUrl}
              className="font-mono text-xs bg-bg-app selection:bg-primary/20"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="gap-2 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-600" />
                  Disalin
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Salin URL
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            Salin URL di atas dan pasang pada menu <span className="font-semibold text-text">Webhook</span> di Dashboard Mayar Sandbox Anda agar status pembayaran otomatis tercatat Lunas.
          </p>
        </div>

        {/* 10 Baris Terakhir mayar_webhook_log */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text">
                10 Baris Terakhir Log Webhook Mayar
              </h3>
              <p className="text-xs text-text-muted">
                Riwayat pesan webhook yang diterima oleh sistem dari Mayar.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-app/50 text-[11px] font-bold uppercase">
                  <TableHead className="w-40">Waktu</TableHead>
                  <TableHead className="w-36">Event</TableHead>
                  <TableHead className="w-44">ID Invoice Mayar</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead>Alasan / Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-text-muted">
                      Belum ada pesan webhook yang diterima dari Mayar.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium whitespace-nowrap text-text-muted">
                        {tanggalWaktu(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] bg-bg-app px-1.5 py-0.5 rounded border border-border">
                          {log.event || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-text-muted">
                        {log.mayar_invoice_id || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === "diterima"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-muted max-w-xs truncate" title={log.alasan || ""}>
                        {log.alasan || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
