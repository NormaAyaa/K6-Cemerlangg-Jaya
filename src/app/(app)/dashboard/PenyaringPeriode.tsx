"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PilihanPeriode } from "@/lib/dashboard-dates";

const DAFTAR_PILIHAN: { kode: PilihanPeriode; label: string }[] = [
  { kode: "hari_ini", label: "Hari Ini" },
  { kode: "7_hari", label: "7 Hari" },
  { kode: "30_hari", label: "30 Hari" },
  { kode: "bulan_ini", label: "Bulan Ini" },
];

export function PenyaringPeriode({
  periodeAktif,
  pDari,
  pSampai,
}: {
  periodeAktif: PilihanPeriode;
  pDari: string;
  pSampai: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tglDari, setTglDari] = useState(pDari);
  const [tglSampai, setTglSampai] = useState(pSampai);
  const [popoverBuka, setPopoverBuka] = useState(false);

  function gantiPilihan(kode: PilihanPeriode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periode", kode);
    params.delete("dari");
    params.delete("sampai");
    router.push(`/dashboard?${params.toString()}`);
  }

  function terapkanKustom(e: React.FormEvent) {
    e.preventDefault();
    if (!tglDari || !tglSampai) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("periode", "kustom");
    params.set("dari", tglDari);
    params.set("sampai", tglSampai);
    router.push(`/dashboard?${params.toString()}`);
    setPopoverBuka(false);
  }

  const labelAktif =
    periodeAktif === "kustom"
      ? `${pDari} s/d ${pSampai}`
      : DAFTAR_PILIHAN.find((p) => p.kode === periodeAktif)?.label || "Bulan Ini";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Tombol Cepat Pilihan Periode */}
      <div className="flex items-center rounded-lg border border-border bg-bg-app p-1 text-xs">
        {DAFTAR_PILIHAN.map((item) => {
          const aktif = periodeAktif === item.kode;
          return (
            <button
              key={item.kode}
              type="button"
              onClick={() => gantiPilihan(item.kode)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                aktif
                  ? "bg-bg-panel text-text shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Popover Kalender Rentang Khusus */}
      <Popover open={popoverBuka} onOpenChange={setPopoverBuka}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 gap-1.5 text-xs ${
              periodeAktif === "kustom" ? "border-primary text-primary" : ""
            }`}
          >
            <CalendarIcon className="size-3.5" />
            {periodeAktif === "kustom" ? labelAktif : "Rentang Khusus"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 text-xs" align="end">
          <form onSubmit={terapkanKustom} className="space-y-3">
            <div className="space-y-1">
              <span className="font-semibold text-text">Pilih Rentang Tanggal</span>
              <p className="text-[11px] text-text-muted">
                Tentukan rentang tanggal analisa data.
              </p>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-medium text-text-muted block mb-1">
                  Dari Tanggal
                </label>
                <Input
                  type="date"
                  value={tglDari}
                  onChange={(e) => setTglDari(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-muted block mb-1">
                  Sampai Tanggal
                </label>
                <Input
                  type="date"
                  value={tglSampai}
                  onChange={(e) => setTglSampai(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <Button type="submit" size="sm" className="w-full h-8 text-xs">
              Terapkan Tanggal
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
