"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPSI_PERIODE = [
  { id: "hari_ini", label: "Hari Ini" },
  { id: "7h", label: "7 Hari" },
  { id: "30h", label: "30 Hari" },
  { id: "bulan_ini", label: "Bulan Ini" },
];

export function FilterPeriode() {
  const searchParams = useSearchParams();
  const periodeAktif = searchParams.get("periode") || "7h";

  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-[#121217] p-1">
      {OPSI_PERIODE.map((opsi) => {
        const aktif = periodeAktif === opsi.id;
        const params = new URLSearchParams(searchParams.toString());
        params.set("periode", opsi.id);

        return (
          <Link
            key={opsi.id}
            href={`/dashboard?${params.toString()}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              aktif
                ? "bg-primary text-white font-semibold shadow-[0_0_12px_rgba(255,46,117,0.35)]"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60",
            )}
          >
            {opsi.label}
          </Link>
        );
      })}
    </div>
  );
}
