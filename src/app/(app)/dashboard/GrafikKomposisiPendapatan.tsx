"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { rupiah, rupiahRingkas } from "@/lib/format";

type Props = {
  pendapatanJasa: number;
  pendapatanPart: number;
};

const WARNA = ["#3B82F6", "#F59E0B"];

export function GrafikKomposisiPendapatan({ pendapatanJasa, pendapatanPart }: Props) {
  const total = pendapatanJasa + pendapatanPart;

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-text-muted">
        Belum ada data pendapatan jasa vs part di periode ini
      </div>
    );
  }

  const data = [
    { name: "Jasa Servis", value: pendapatanJasa },
    { name: "Spare Part", value: pendapatanPart },
  ];

  const persenJasa = Math.round((pendapatanJasa / total) * 100);
  const persenPart = 100 - persenJasa;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={WARNA[index % WARNA.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: unknown) => [rupiah(Number(val) || 0), "Nilai"]}
              contentStyle={{
                backgroundColor: "var(--bg-panel)",
                borderColor: "var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Total di tengah Donut */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-text-muted">Total</span>
          <span className="text-sm font-bold text-text">{rupiahRingkas(total)}</span>
        </div>
      </div>

      {/* Legenda Bawah */}
      <div className="grid w-full grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-blue-500" />
          <div className="truncate">
            <span className="text-text-muted block">Jasa ({persenJasa}%)</span>
            <span className="font-semibold text-text">{rupiah(pendapatanJasa)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-amber-500" />
          <div className="truncate">
            <span className="text-text-muted block">Spare Part ({persenPart}%)</span>
            <span className="font-semibold text-text">{rupiah(pendapatanPart)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
