import Link from "next/link";
import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  kode?: string;
  judul: string;
  nilai: string;
  subnilai?: string;
  perubahan?: number | null; // percentage e.g. 12.5
  teksPerubahan?: string;
  ikon?: LucideIcon;
  bahaya?: boolean;
  peringatan?: boolean;
  href?: string;
};

export function KartuKpi({
  judul,
  nilai,
  subnilai,
  perubahan,
  teksPerubahan,
  ikon: Ikon,
  bahaya,
  peringatan,
  href,
}: Props) {
  const CardContent = (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border bg-[#111116] p-3.5 sm:p-4 transition-all duration-200 hover:border-primary/40 hover:bg-[#14141c] hover:shadow-[0_0_16px_rgba(255,46,117,0.12)]",
        bahaya
          ? "border-rose-950/60 hover:border-rose-800/80"
          : peringatan
          ? "border-amber-950/60 hover:border-amber-800/80"
          : "border-zinc-800/80",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-medium text-zinc-400 truncate">{judul}</p>
        {Ikon && (
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
              bahaya
                ? "bg-rose-950/40 text-rose-400"
                : peringatan
                ? "bg-amber-950/40 text-amber-400"
                : "bg-zinc-800/60 text-zinc-400 group-hover:bg-primary/15 group-hover:text-primary",
            )}
          >
            <Ikon className="size-3.5" />
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <p
          className={cn(
            "font-bold tracking-tight text-white tabular-nums leading-none",
            nilai.length > 10
              ? "text-lg sm:text-xl xl:text-lg 2xl:text-xl"
              : nilai.length > 6
              ? "text-xl sm:text-2xl xl:text-xl 2xl:text-2xl"
              : "text-2xl sm:text-3xl",
          )}
          title={nilai}
        >
          {nilai}
        </p>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
        {perubahan !== undefined && perubahan !== null ? (
          <>
            {perubahan > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/15 border border-primary/30">
                <ArrowUpRight className="size-2.5" />
                +{perubahan}%
              </span>
            ) : perubahan < 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-rose-400 bg-rose-950/50 border border-rose-900/40">
                <ArrowDownRight className="size-2.5" />
                {perubahan}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 bg-zinc-800/50">
                <Minus className="size-2.5" />
                0%
              </span>
            )}
            <span className="text-[10px] text-zinc-500 truncate">
              {teksPerubahan ?? "vs periode lalu"}
            </span>
          </>
        ) : subnilai ? (
          <p className="text-[11px] text-zinc-500 truncate">{subnilai}</p>
        ) : (
          <div />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
