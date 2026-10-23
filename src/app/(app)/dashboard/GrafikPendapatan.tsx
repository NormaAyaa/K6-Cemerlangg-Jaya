"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rupiah, rupiahRingkas } from "@/lib/format";

type DataPoint = {
  tanggal: string;
  pendapatan_jasa?: number;
  pendapatan_part?: number;
  laba?: number;
  pendapatan?: number;
};

type Props = {
  data: DataPoint[];
  tampilkanLaba?: boolean;
};

export function GrafikPendapatan({ data, tampilkanLaba = false }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-center text-xs text-zinc-500">
        Belum ada data pendapatan pada periode ini.
      </div>
    );
  }

  // Format short date "DD MMM"
  const chartData = data.map((d) => {
    const parts = d.tanggal.split("-");
    const labelTgl = parts.length === 3 ? `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}` : d.tanggal;
    return {
      ...d,
      labelTgl,
      totalPendapatan: d.pendapatan ?? (d.pendapatan_jasa ?? 0) + (d.pendapatan_part ?? 0),
    };
  });

  return (
    <div className="h-72 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            {/* Primary Porsche GT3 RS Pink Gradient */}
            <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF2E75" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#FF2E75" stopOpacity={0.0} />
            </linearGradient>
            {/* Vibrant Rose Pink Gradient */}
            <linearGradient id="colorJasa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
            </linearGradient>
            {/* Soft Light Pink Laba Gradient */}
            <linearGradient id="colorLaba" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FDA4AF" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#FDA4AF" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />

          <XAxis
            dataKey="labelTgl"
            tickLine={false}
            axisLine={{ stroke: "#3F3F46" }}
            tick={{ fontSize: 11, fill: "#71717A", fontFamily: "var(--font-mono)" }}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => rupiahRingkas(val)}
            tick={{ fontSize: 11, fill: "#71717A", fontFamily: "var(--font-mono)" }}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const cur = payload[0].payload;
              return (
                <div className="rounded-lg border border-primary/30 bg-[#0e0e14]/95 p-3 shadow-2xl font-mono text-xs backdrop-blur-md">
                  <div className="border-b border-zinc-800 pb-1 mb-2 font-bold text-zinc-300">
                    {"TANGGAL: "}{cur.tanggal}
                  </div>
                  {cur.pendapatan_part !== undefined && (
                    <div className="flex items-center justify-between gap-4 py-0.5 text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[#FF2E75] shadow-[0_0_6px_#FF2E75]" />
                        Spare Part:
                      </span>
                      <span className="font-bold text-white">{rupiah(cur.pendapatan_part)}</span>
                    </div>
                  )}
                  {cur.pendapatan_jasa !== undefined && (
                    <div className="flex items-center justify-between gap-4 py-0.5 text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[#F43F5E] shadow-[0_0_6px_#F43F5E]" />
                        Jasa:
                      </span>
                      <span className="font-bold text-white">{rupiah(cur.pendapatan_jasa)}</span>
                    </div>
                  )}
                  {tampilkanLaba && cur.laba !== undefined && (
                    <div className="flex items-center justify-between gap-4 py-0.5 text-pink-300 font-semibold border-t border-zinc-800 mt-1 pt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[#FDA4AF] shadow-[0_0_6px_#FDA4AF]" />
                        Laba Kotor:
                      </span>
                      <span className="text-white">{rupiah(cur.laba)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 py-0.5 font-bold text-white border-t border-zinc-800 mt-1 pt-1">
                    <span className="text-zinc-300">Total Pendapatan:</span>
                    <span className="text-primary">{rupiah(cur.totalPendapatan)}</span>
                  </div>
                </div>
              );
            }}
          />

          {/* Area layers */}
          <Area
            type="monotone"
            dataKey="pendapatan_part"
            name="Spare Part"
            stroke="#FF2E75"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPart)"
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="pendapatan_jasa"
            name="Jasa Servis"
            stroke="#F43F5E"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorJasa)"
            stackId="1"
          />
          {tampilkanLaba && (
            <Area
              type="monotone"
              dataKey="laba"
              name="Laba Kotor"
              stroke="#FDA4AF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorLaba)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
