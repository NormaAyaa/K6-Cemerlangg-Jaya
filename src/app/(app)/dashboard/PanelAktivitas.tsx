import { UserCheck } from "lucide-react";

type LogItem = {
  id: number;
  waktu: string;
  pelaku_peran: string | null;
  aksi: string;
  tabel: string;
  alasan: string | null;
};

type Props = {
  logs: LogItem[];
};

export function PanelAktivitas({ logs }: Props) {
  if (!logs || logs.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-zinc-500 font-mono">
        Belum ada riwayat aktivitas terbaru.
      </div>
    );
  }

  return (
    <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
      {logs.map((log) => {
        const waktuLabel = new Date(log.waktu).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        });

        return (
          <div key={log.id} className="relative group">
            {/* Timeline dot with neon glow */}
            <span className="absolute -left-4 top-1.5 size-2 rounded-full border-2 border-[#12121a] bg-primary group-hover:scale-125 group-hover:shadow-[0_0_8px_#FF2E75] transition-all" />

            <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-2.5 transition-colors group-hover:bg-zinc-800/60">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="inline-flex items-center gap-1 font-semibold text-zinc-300 uppercase">
                  <UserCheck className="size-3 text-primary" />
                  {log.pelaku_peran ?? "SISTEM"}
                </span>
                <span className="text-zinc-500">{waktuLabel}</span>
              </div>

              <p className="mt-1 text-xs font-medium text-white">
                <span className="font-mono text-primary font-bold">{log.aksi}</span> pada tabel{" "}
                <code className="rounded border border-zinc-700/60 bg-zinc-800 px-1 py-0.2 text-[10px] text-pink-300 font-mono">
                  {log.tabel}
                </code>
              </p>

              {log.alasan && (
                <p className="mt-1 text-[11px] italic text-zinc-400">
                  &ldquo;{log.alasan}&rdquo;
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
