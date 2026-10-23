import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * Navigasi halaman untuk daftar berhalaman. Parameter lain di URL (pencarian,
 * penyaring) dipertahankan; hanya `hal` yang berganti.
 */
export function Paginasi({
  halaman,
  totalBaris,
  perHalaman,
  params,
}: {
  halaman: number;
  totalBaris: number;
  perHalaman: number;
  params: Record<string, string | undefined>;
}) {
  const totalHalaman = Math.max(1, Math.ceil(totalBaris / perHalaman));
  if (totalHalaman === 1) return null;

  const href = (hal: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    sp.set("hal", String(hal));
    return `?${sp}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-xs text-zinc-400">
        Halaman <span className="text-white font-medium">{halaman}</span> dari{" "}
        <span className="text-white font-medium">{totalHalaman}</span> ·{" "}
        <span className="text-zinc-300 font-medium">{totalBaris}</span> data
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent className="gap-1.5">
          <PaginationItem>
            <PaginationPrevious
              text="Sebelumnya"
              href={href(halaman - 1)}
              aria-disabled={halaman <= 1}
              className={cn(
                "border border-zinc-800 bg-[#111116] text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs h-8 px-3",
                halaman <= 1 && "pointer-events-none opacity-40"
              )}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href={href(halaman)}
              isActive
              className="border border-primary/40 bg-primary/15 text-primary hover:bg-primary/20 text-xs font-semibold h-8 min-w-8"
            >
              {halaman}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              text="Berikutnya"
              href={href(halaman + 1)}
              aria-disabled={halaman >= totalHalaman}
              className={cn(
                "border border-zinc-800 bg-[#111116] text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs h-8 px-3",
                halaman >= totalHalaman && "pointer-events-none opacity-40"
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
