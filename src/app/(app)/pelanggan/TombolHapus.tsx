"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Larangan hapus PRD 6.3 dijaga foreign key di database (on delete restrict),
 * jadi di sini cukup menerjemahkan kode error 23503 menjadi pesan yang jelas.
 *
 * The PRD 6.3 delete restrictions are enforced by foreign keys (on delete restrict),
 * so this only translates error code 23503 into a clear message.
 */
const ATURAN = {
  pelanggan: {
    tabel: "customers",
    judul: "Hapus pelanggan ini?",
    terkunci: "Pelanggan ini masih punya kendaraan. Hapus kendaraannya dulu.",
    berhasil: "Pelanggan dihapus",
  },
  kendaraan: {
    tabel: "vehicles",
    judul: "Hapus kendaraan ini?",
    terkunci: "Kendaraan ini punya riwayat WO, jadi tidak bisa dihapus.",
    berhasil: "Kendaraan dihapus",
  },
} as const;

export function TombolHapus({
  jenis,
  id,
  nama,
  sesudahnya,
}: {
  jenis: keyof typeof ATURAN;
  id: string;
  nama: string;
  /** Alamat tujuan setelah terhapus; kosong = muat ulang halaman / Where to go after deleting; empty = refresh */
  sesudahnya?: string;
}) {
  const router = useRouter();
  const aturan = ATURAN[jenis];

  async function hapus() {
    const { error } = await createClient().from(aturan.tabel).delete().eq("id", id);
    if (error) {
      toast.error(error.code === "23503" ? aturan.terkunci : "Data gagal dihapus. Coba lagi.");
      return;
    }
    toast.success(aturan.berhasil);
    if (sesudahnya) router.push(sesudahnya);
    else router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Hapus ${nama}`}
          className="size-7 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[#111116] border border-zinc-800 text-white sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-base font-semibold">
            {aturan.judul}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">{nama}</span> akan dihapus secara permanen dari sistem bengkel.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={hapus}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
