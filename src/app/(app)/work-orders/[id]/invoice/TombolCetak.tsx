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
        const { data, error } = await supabase
          .from("invoices")
          .select("status_bayar, dibayar_online_at")
          .eq("id", invoiceId)
          .maybeSingle();

        if (error) {
          console.error("Gagal memeriksa status invoice:", error);
          return;
        }

        if (data && data.status_bayar === "lunas") {
          hentikanPolling();
          setStatusBayar("lunas");
          const waktuLunas = data.dibayar_online_at || new Date().toISOString();
          setDibayarOnlineAt(waktuLunas);
          toast.success("Pembayaran berhasil diverifikasi! Invoice telah Lunas.");
          router.refresh();
        }
      } catch (err) {
        console.error("Kesalahan saat polling status invoice:", err);
      }
    }, 5000);
  }

  async function handleBayarOnline() {
    setLoading(true);
    setErrorPesan(null);

    try {
      const res = await fetch("/api/pembayaran/buat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoiceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat tautan pembayaran Mayar");
      }

      if (!data.link) {
        throw new Error("Tautan pembayaran tidak diterima dari server Mayar");
      }

      setTautanMayar(data.link);

      // Buka tautan Mayar di tab baru
      const tabBaru = window.open(data.link, "_blank", "noopener,noreferrer");
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
        <Button asChild variant="outline" className="gap-2">
          <Link href={`/work-orders/${woId}/tagihan`}>
            <ArrowLeft className="size-4" />
            Kembali ke Tagihan
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          {bolehBayarOnline && (
            <Button
              type="button"
              onClick={handleBayarOnline}
              disabled={loading || isPolling}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CreditCard className="size-4" />
              )}
              {loading ? "Menyiapkan Mayar..." : "Bayar Online"}
            </Button>
          )}

          <Button
            onClick={() => window.print()}
            className="bg-primary hover:bg-primary-strong text-white gap-2 shadow-xs"
          >
            <Printer className="size-4" />
            Cetak Invoice / Simpan PDF
          </Button>
        </div>
      </div>

      {/* Banner Error jika pembuatan tautan gagal */}
      {errorPesan && (
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Gagal Memproses Pembayaran Online</p>
              <p className="mt-0.5">{errorPesan}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setErrorPesan(null)}
            className="h-6 px-2 text-rose-700 hover:text-rose-900 text-xs"
          >
            Tutup
          </Button>
        </div>
      )}

      {/* Banner Polling Aktif (setiap 5 detik selama 5 menit) */}
      {isPolling && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-900 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Loader2 className="size-4 animate-spin text-sky-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-sky-950">
                  Memeriksa Status Pembayaran Online
                </span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-200/70 text-sky-800">
                  {sisaWaktuFormatted}
                </span>
              </div>
              <p className="text-sky-700 mt-0.5">
                Sistem memeriksa status invoice setiap 5 detik secara otomatis selama 5 menit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tautanMayar && (
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-white">
                <a href={tautanMayar} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Buka Tautan Mayar
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => hentikanPolling("Pemeriksaan otomatis dihentikan")}
              className="h-7 text-xs gap-1 text-sky-800 hover:bg-sky-100"
            >
              <StopCircle className="size-3.5" />
              Hentikan
            </Button>
          </div>
        </div>
      )}

      {/* Banner Status Lunas setelah pembayaran online terkonfirmasi */}
      {statusBayar === "lunas" && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-emerald-950">
                  Status Invoice:
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                  LUNAS
                </span>
              </div>
              <p className="text-emerald-700 mt-0.5">
                Waktu dibayar:{" "}
                <span className="font-medium text-emerald-900">
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
