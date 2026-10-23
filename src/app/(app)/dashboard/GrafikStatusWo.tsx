"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const WARNA_STATUS: Record<string, { bg: string; text: string; hex: string; label: string }> = {
  menunggu: { bg: "bg-zinc-600", text: "text-zinc-400", hex: "#71717A", label: "Menunggu" },
  dikerjakan: { bg: "bg-[#FF2E75]", text: "text-[#FF2E75]", hex: "#FF2E75", label: "Dikerjakan" },
  tertunda: { bg: "bg-amber-500", text: "text-amber-400", hex: "#F59E0B", label: "Tertunda" },
  selesai: { bg: "bg-pink-400", text: "text-pink-300", hex: "#F472B6", label: "Selesai (QC)" },
  siap_diambil: { bg: "bg-rose-400", text: "text-rose-300", hex: "#FB7185", label: "Siap Diambil" },
  diambil: { bg: "bg-rose-600", text: "text-rose-400", hex: "#E11D48", label: "Diambil / Lunas" },
  dibatalkan: { bg: "bg-zinc-700", text: "text-zinc-500", hex: "#52525B", label: "Dibatalkan" },
};

type Props = {
  data: { status: string; jumlah: number }[];
};

export function GrafikStatusWo({ data }: Props) {
  const total = data.reduce((acc, cur) => acc + cur.jumlah, 0);

  return (
    <div className="space-y-3 pt-2">
      {/* Top stacked horizontal bar preview */}
      {total > 0 && (
        <div className="flex h-3 w-full overflow-hidden rounded-md bg-zinc-800/80 p-0.5 border border-zinc-700/40">
          {data.map((item) => {
            if (item.jumlah === 0) return null;
            const pct = (item.jumlah / total) * 100;
            const cfg = WARNA_STATUS[item.status] ?? { hex: "#CBD5E1" };
            return (
              <div
                key={item.status}
                style={{ width: `${pct}%`, backgroundColor: cfg.hex }}
                className="h-full first:rounded-l-sm last:rounded-r-sm transition-all duration-300"
                title={`${item.status}: ${item.jumlah}`}
              />
            );
          })}
        </div>
      )}

      {/* List with clickable rows */}
      <div className="divide-y divide-zinc-800/80">
        {data.map((item) => {
          const cfg = WARNA_STATUS[item.status] ?? {
            bg: "bg-zinc-400",
            text: "text-zinc-400",
            hex: "#94A3B8",
            label: item.status,
          };
          const pct = total > 0 ? Math.round((item.jumlah / total) * 100) : 0;

          return (
            <Link
              key={item.status}
              href={`/work-orders?status=${item.status}`}
              className="group flex items-center justify-between py-2 text-xs transition-colors hover:bg-zinc-800/50 px-2 rounded-md"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={cn("size-2.5 shrink-0 rounded-full", cfg.bg)} />
                <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">
                  {cfg.label}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-zinc-500">{pct}%</span>
                <span className="inline-flex min-w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-xs font-bold text-zinc-300 group-hover:border-primary/40 group-hover:bg-primary-soft/10 group-hover:text-primary transition-all">
                  {item.jumlah}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
