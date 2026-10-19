"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BebanItem = {
  mekanik: string;
  tim: string;
  wo_aktif: number;
  wo_selesai: number;
};

export function GrafikBebanMekanik({ data }: { data: BebanItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-text-muted">
        Tidak ada data mekanik aktif di periode ini
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: `${d.mekanik}`,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as BebanItem;
                return (
                  <div className="rounded-lg border border-border bg-bg-panel p-2.5 text-xs shadow-md">
                    <p className="font-semibold text-text">{item.mekanik}</p>
                    <p className="text-[11px] text-text-muted mb-1.5">Tim: {item.tim}</p>
                    <div className="space-y-1">
                      <p className="text-blue-500 flex justify-between gap-4">
                        <span>Sedang Dikerjakan:</span>
                        <span className="font-bold">{item.wo_aktif} WO</span>
                      </p>
                      <p className="text-emerald-600 flex justify-between gap-4">
                        <span>Selesai (Periode Ini):</span>
                        <span className="font-bold">{item.wo_selesai} WO</span>
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
            wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
            formatter={(val) => <span className="text-xs text-text">{val}</span>}
          />
          <Bar name="WO Aktif" dataKey="wo_aktif" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar name="WO Selesai" dataKey="wo_selesai" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
