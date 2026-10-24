import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wrench } from "lucide-react";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormWorkOrderBaru } from "./FormWorkOrderBaru";

export default async function HalamanWorkOrderBaru() {
  const profil = await ambilProfilSaya();

  // Hanya Admin dan Owner yang boleh membuat Work Order (PRD 6.6 & 6.7)
  if (profil.peran !== "admin" && profil.peran !== "owner") {
    redirect("/work-orders");
  }

  const supabase = await createClient();

  // Ambil daftar kepala mekanik aktif
  const { data: kepalaMekanik } = await supabase
    .from("profiles")
    .select("id, nama")
    .eq("role", "kepala_mekanik")
    .eq("aktif", true)
    .order("nama");

  // Ambil jumlah WO aktif per tim untuk ditampilkan (PRD 6.7)
  const { data: woAktif } = await supabase
    .from("work_orders")
    .select("kepala_mekanik_id")
    .in("status", ["menunggu", "dikerjakan", "tertunda", "selesai", "siap_diambil"]);

  const hitunganWoPerTim = (woAktif ?? []).reduce<Record<string, number>>((acc, wo) => {
    acc[wo.kepala_mekanik_id] = (acc[wo.kepala_mekanik_id] || 0) + 1;
    return acc;
  }, {});

  const daftarTim = (kepalaMekanik ?? []).map((km) => ({
    id: km.id,
    nama: km.nama,
    jumlahWoAktif: hitunganWoPerTim[km.id] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5">
        <Link
          href="/work-orders"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5 text-[#FF2E75]" />
          Kembali ke daftar Work Order
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-[#FF2E75]">
            <Wrench className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Buat Work Order Baru
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Isi data kunjungan kendaraan, keluhan pemilik, dan dokumentasi foto awal bengkel
            </p>
          </div>
        </div>
      </div>

      <FormWorkOrderBaru daftarTim={daftarTim} userId={profil.id} />
    </div>
  );
}
