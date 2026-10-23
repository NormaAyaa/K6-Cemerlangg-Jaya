"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Printer,
  StopCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { tanggalWaktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

interface Props {
  woId: string;
  invoiceId: string;
  statusBayarAwal: string;
  dibayarOnlineAtAwal: string | null;
  peran: string;
}

export function TombolCetak({
  woId,
  invoiceId,
  statusBayarAwal,
  dibayarOnlineAtAwal,
  peran,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [sisaDetik, setSisaDetik] = useState(300); // 5 menit
  const [statusBayar, setStatusBayar] = useState(statusBayarAwal);
  const [dibayarOnlineAt, setDibayarOnlineAt] = useState<string | null>(dibayarOnlineAtAwal);
  const [tautanMayar, setTautanMayar] = useState<string | null>(null);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Sinkronisasi state jika props server berubah
  useEffect(() => {
    setStatusBayar(statusBayarAwal);
    setDibayarOnlineAt(dibayarOnlineAtAwal);
  }, [statusBayarAwal, dibayarOnlineAtAwal]);

  // Bersihkan timer saat unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const bolehBayarOnline = (peran === "admin" || peran === "owner") && statusBayar !== "lunas";

  function hentikanPolling(info?: string) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setIsPolling(false);
    if (info) toast.info(info);
  }

  function mulaiPolling() {
    hentikanPolling();
    setIsPolling(true);
    setSisaDetik(300);

    const supabase = createClient();
    const batasWaktu = Date.now() + 5 * 60 * 1000; // 5 menit

    // Countdown setiap 1 detik untuk indikator waktu
    countdownRef.current = setInterval(() => {
      setSisaDetik((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    // Polling setiap 5 detik ke database
    timerRef.current = setInterval(async () => {
      if (Date.now() >= batasWaktu) {
        hentikanPolling("Pemeriksaan otomatis 5 menit selesai.");
        return;
      }

      try {
        const { data: inv } = await supabase
          .from("invoices")
          .select("status_bayar, dibayar_online_at")
          .eq("id", invoiceId)
          .single();

        if (inv && inv.status_bayar === "lunas") {
          setStatusBayar("lunas");
          setDibayarOnlineAt(inv.dibayar_online_at);
          hentikanPolling();
          toast.success("Pembayaran online berhasil dikonfirmasi! Invoice telah lunas.");
          router.refresh();
        }
      } catch {
        // Abaikan error jaringan sementara pada background polling
      }
    }, 5000);
  }

  async function handleBayarOnline() {
    setErrorPesan(null);
    setLoading(true);

    try {
      // Buka window kosong duluan agar tidak diblokir pop-up blocker browser
      const tabBaru = window.open("about:blank", "_blank");

      const res = await fetch(`/api/invoices/${invoiceId}/mayar`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        if (tabBaru) tabBaru.close();
        throw new Error(json.error || "Gagal membuat tautan pembayaran Mayar");
      }

      const linkMayar = json.link;
      setTautanMayar(linkMayar);

      // Arahkan tab kosong ke URL Mayar
      if (tabBaru) {
        tabBaru.location.href = linkMayar;
      }

      if (!tabBaru) {
        toast.warning(
          "Popup tab baru diblokir oleh browser. Silakan klik tombol 'Buka Tautan Mayar' di bawah.",
        );
      } else {
        toast.success("Membuka halaman pembayaran Mayar di tab baru");
      }

      // Mulai periksa status invoice setiap 5 detik selama 5 menit
      mulaiPolling();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses pembayaran online";
      setErrorPesan(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const menit = Math.floor(sisaDetik / 60);
  const detik = sisaDetik % 60;
  const sisaWaktuFormatted = `${menit}:${detik < 10 ? "0" : ""}${detik}`;

  return (
    <div className="space-y-4 print:hidden mb-6">
      {/* Baris Tombol Aksi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="gap-1.5 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white font-mono text-xs"
        >
          <Link href={`/work-orders/${woId}/tagihan`}>
            <ArrowLeft className="size-3.5 text-[#FF2E75]" />
            Kembali ke Tagihan
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          {bolehBayarOnline && (
            <Button
              type="button"
              onClick={handleBayarOnline}
              disabled={loading || isPolling}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-mono text-xs shadow-md shadow-emerald-950/30"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CreditCard className="size-4" />
              )}
              {loading ? "Menyiapkan Mayar..." : "Bayar Online (Mayar)"}
            </Button>
          )}

          <Button
            onClick={() => window.print()}
            className="bg-primary hover:bg-primary-strong text-white gap-2 font-mono text-xs shadow-md shadow-pink-950/30"
          >
            <Printer className="size-4" />
            Cetak Invoice / Simpan PDF
          </Button>
        </div>
      </div>

      {/* Banner Error jika pembuatan tautan gagal */}
      {errorPesan && (
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs font-mono">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">Gagal Memproses Pembayaran Online</p>
              <p className="mt-0.5 text-zinc-300">{errorPesan}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setErrorPesan(null)}
            className="h-6 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
          >
            Tutup
          </Button>
        </div>
      )}

      {/* Banner Polling Aktif (setiap 5 detik selama 5 menit) */}
      {isPolling && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300 text-xs font-mono shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Loader2 className="size-4 animate-spin text-sky-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-sky-200">
                  Memeriksa Status Pembayaran Online
                </span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {sisaWaktuFormatted}
                </span>
              </div>
              <p className="text-zinc-400 mt-0.5 text-[11px]">
                Sistem memeriksa status invoice setiap 5 detik secara otomatis selama 5 menit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tautanMayar && (
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
                <a href={tautanMayar} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5 text-[#FF2E75]" />
                  Buka Tautan Mayar
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => hentikanPolling("Pemeriksaan otomatis dihentikan")}
              className="h-7 text-xs gap-1 text-sky-400 hover:bg-sky-500/20"
            >
              <StopCircle className="size-3.5" />
              Hentikan
            </Button>
          </div>
        </div>
      )}

      {/* Banner Status Lunas setelah pembayaran online terkonfirmasi */}
      {statusBayar === "lunas" && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs font-mono shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">
                  Status Invoice:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider font-mono">
                  LUNAS
                </span>
              </div>
              <p className="text-zinc-400 mt-0.5 text-[11px]">
                Waktu dibayar:{" "}
                <span className="font-medium text-emerald-400">
                  {tanggalWaktu(dibayarOnlineAt)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
