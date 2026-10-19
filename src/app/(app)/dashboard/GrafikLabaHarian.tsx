"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rupiah, rupiahRingkas, tanggal } from "@/lib/format";

type DataPoint = {
  tanggal: string;
  pendapatan: number;
  modal: number;
  laba: number;
};

export function GrafikLabaHarian({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-text-muted">
        Belum ada data pendapatan dan laba di periode ini
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    labelTgl: tanggal(d.tanggal).split(" ").slice(0, 2).join(" "), // "1 Okt"
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="warnaPendapatan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="warnaModal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
          <XAxis
            dataKey="labelTgl"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => rupiahRingkas(v)}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            width={48}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as DataPoint & { labelTgl: string };
                return (
                  <div className="rounded-lg border border-border bg-bg-panel p-3 text-xs shadow-md">
                    <p className="font-semibold text-text mb-1.5">{tanggal(item.tanggal)}</p>
                    <div className="space-y-1">
                      <p className="text-blue-500 flex justify-between gap-4">
                        <span>Pendapatan:</span>
                        <span className="font-semibold">{rupiah(item.pendapatan)}</span>
                      </p>
                      <p className="text-amber-500 flex justify-between gap-4">
                        <span>Modal Part:</span>
                        <span className="font-semibold">{rupiah(item.modal)}</span>
                      </p>
                      <p className="text-emerald-600 flex justify-between gap-4 border-t border-border pt-1">
                        <span>Laba Bersih:</span>
                        <span className="font-bold">{rupiah(item.laba)}</span>
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
            formatter={(val) => <span className="text-xs text-text">{val}</span>}
          />
          <Area
            type="monotone"
            name="Pendapatan"
            dataKey="pendapatan"
            stroke="#3B82F6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#warnaPendapatan)"
          />
          <Area
            type="monotone"
            name="Modal Part"
            dataKey="modal"
            stroke="#F59E0B"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#warnaModal)"
          />
          <Line
            type="monotone"
            name="Laba Kotor"
            dataKey="laba"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
