"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tanggal } from "@/lib/format";

type Point = {
  tanggal: string;
  jumlah: number;
};

export function GrafikWoSelesaiHarian({ data }: { data: Point[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-text-muted">
        Tidak ada data WO selesai di periode ini
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    labelTgl: tanggal(d.tanggal).split(" ").slice(0, 2).join(" "),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
          <XAxis dataKey="labelTgl" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as Point;
                return (
                  <div className="rounded-lg border border-border bg-bg-panel p-2.5 text-xs shadow-md">
                    <p className="font-semibold text-text">{tanggal(item.tanggal)}</p>
                    <p className="text-purple-600 mt-1 font-bold">
                      {item.jumlah} Motor Selesai
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            name="WO Selesai"
            dataKey="jumlah"
            stroke="#8B5CF6"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#8B5CF6" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
