import { Badge } from "@/components/ui/badge";
import { isStatusWO, STATUS_WO } from "@/lib/status-wo";

// Titik berwarna + teks terang dengan container border gelap
export function BadgeStatus({ status }: { status: string }) {
  const info = isStatusWO(status) ? STATUS_WO[status] : { label: status, warna: "#71717a" };

  return (
    <Badge variant="outline" className="gap-1.5 border-zinc-800 bg-zinc-900/80 text-zinc-200 font-mono text-xs shadow-xs">
      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: info.warna }} aria-hidden />
      <span>{info.label}</span>
    </Badge>
  );
}
