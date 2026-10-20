"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StatusPoint = {
  status: string;
  jumlah: number;
};

const WARNA_STATUS: Record<string, string> = {
  menunggu: "#94A3B8", // Abu
  dikerjakan: "#3B82F6", // Biru
  tertunda: "#F59E0B", // Kuning/Amber
  selesai: "#8B5CF6", // Ungu
  siap_diambil: "#10B981", // Hijau
  diambil: "#0EA5E9", // Biru Cerah/Teal
  dibatalkan: "#EF4444", // Merah
};

const LABEL_STATUS: Record<string, string> = {
  menunggu: "Menunggu",
  dikerjakan: "Dikerjakan",
  tertunda: "Tertunda",
  selesai: "Selesai",
  siap_diambil: "Siap Diambil",
  diambil: "Diambil",
  dibatalkan: "Dibatalkan",
};

export function GrafikWoStatus({ data }: { data: StatusPoint[] }) {
  const router = useRouter();

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-text-muted">
        Tidak ada data status Work Order
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: LABEL_STATUS[d.status] || d.status,
    color: WARNA_STATUS[d.status] || "#94A3B8",
  }));


  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            width={85}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as typeof chartData[0];
                return (
                  <div className="rounded-lg border border-border bg-bg-panel p-2 text-xs shadow-md">
                    <p className="font-semibold text-text">{item.label}</p>
                    <p className="text-text-muted">
                      Total: <span className="font-bold text-text">{item.jumlah} WO</span>
                    </p>
                    <p className="text-[10px] text-primary mt-1">Klik untuk membuka daftar</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="jumlah"
            radius={[0, 4, 4, 0]}
            className="cursor-pointer transition-opacity hover:opacity-80"
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.status}`}
                fill={entry.color}
                onClick={() => router.push(`/work-orders?status=${entry.status}`)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
