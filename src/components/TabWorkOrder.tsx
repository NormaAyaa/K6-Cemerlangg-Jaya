"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Tab "Rincian | Tagihan" di rincian WO. Dua alamat terpisah supaya Fitur A
 * dan Fitur B tidak mengubah file yang sama (PRD 6.8).
 */
export function TabWorkOrder({ id }: { id: string }) {
  const pathname = usePathname();
  const tab = [
    { href: `/work-orders/${id}`, label: "Rincian" },
    { href: `/work-orders/${id}/tagihan`, label: "Tagihan" },
  ];

  return (
    <nav className="inline-flex rounded-lg bg-zinc-900 border border-zinc-800 p-1 font-mono text-xs" aria-label="Bagian work order">
      {tab.map((t) => {
        const aktif = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={aktif ? "page" : undefined}
            className={cn(
              "rounded-md px-4 py-1.5 font-medium transition-colors",
              aktif
                ? "bg-zinc-800 text-[#FF2E75] font-semibold shadow-xs"
                : "text-zinc-400 hover:text-white"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
