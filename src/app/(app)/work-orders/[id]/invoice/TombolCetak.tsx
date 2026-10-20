"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TombolCetak({ woId }: { woId: string }) {
  return (
    <div className="flex items-center justify-between gap-3 print:hidden mb-6">
      <Button asChild variant="outline" className="gap-2">
        <Link href={`/work-orders/${woId}/tagihan`}>
          <ArrowLeft className="size-4" />
          Kembali ke Tagihan
        </Link>
      </Button>

      <Button
        onClick={() => window.print()}
        className="bg-primary hover:bg-primary-strong text-white gap-2 shadow-xs"
      >
        <Printer className="size-4" />
        Cetak Invoice / Simpan PDF
      </Button>
    </div>
  );
}
