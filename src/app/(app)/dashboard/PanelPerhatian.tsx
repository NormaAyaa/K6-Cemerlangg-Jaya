import Link from "next/link";
import { Clock, Package } from "lucide-react";
import { tanggal } from "@/lib/format";

type WoTerlambat = {
  id: string;
  nomor: string;
  keluhan: string;
  estimasi_selesai: string | null;
  vehicles: { plat: string; merek_model: string } | null;
};

type ItemMenipis = {
  id: string;
  kode: string;
  nama: string;
  stok: number;
  stok_minimum: number;
};

type Props = {
  woTerlambat: WoTerlambat[];
  stokMenipis: ItemMenipis[];
};

export function PanelPerhatian({ woTerlambat, stokMenipis }: Props) {
  const adaIsu = woTerlambat.length > 0 || stokMenipis.length > 0;

  if (!adaIsu) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-800/50 bg-emerald-950/20 p-6 text-center">
        <span className="size-2 rounded-full bg-emerald-500 mb-2 animate-ping" />
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          STATUS OPERASIONAL OPTIMAL
        </p>
        <p className="mt-1 text-xs text-emerald-500/80">
          Tidak ada Work Order terlambat maupun stok di bawah batas minimum saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* WO Terlambat List */}
      {woTerlambat.map((wo) => (
        <Link
          key={wo.id}
          href={`/work-orders/${wo.id}`}
          className="group block rounded-lg border border-rose-900/60 bg-rose-950/20 p-3 transition-all hover:border-rose-500/80 hover:bg-rose-950/40 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-rose-400">
              <Clock className="size-3.5" />
              <span>{wo.nomor}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-white">{wo.vehicles?.plat ?? "PLAT -"}</span>
            </div>
            <span className="inline-flex items-center rounded-full border border-rose-800/60 bg-rose-950/80 px-2 py-0.5 text-[9px] font-mono font-bold text-rose-400">
              TERLAMBAT
            </span>
          </div>

          <p className="mt-1 line-clamp-1 text-xs text-zinc-300">{wo.keluhan}</p>

          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Model: <span className="text-zinc-300">{wo.vehicles?.merek_model ?? "-"}</span></span>
            <span className="text-rose-400">
              Est: {wo.estimasi_selesai ? tanggal(wo.estimasi_selesai) : "-"}
            </span>
          </div>
        </Link>
      ))}

      {/* Stok Menipis List */}
      {stokMenipis.map((item) => (
        <Link
          key={item.id}
          href="/inventory"
          className="group block rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 transition-all hover:border-amber-500/80 hover:bg-amber-950/40 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-400">
              <Package className="size-3.5" />
              <span>{item.kode}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-white truncate max-w-[140px]">{item.nama}</span>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-mono font-bold ${
                item.stok === 0
                  ? "border-rose-800/60 bg-rose-950/80 text-rose-400"
                  : "border-amber-800/60 bg-amber-950/80 text-amber-400"
              }`}
            >
              {item.stok === 0 ? "HABIS" : "MENIPIS"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-400">Sisa Stok: <b className="text-white">{item.stok}</b></span>
            <span className="text-zinc-400">Min. Target: <b className="text-white">{item.stok_minimum}</b></span>
          </div>
        </Link>
      ))}
    </div>
  );
}
