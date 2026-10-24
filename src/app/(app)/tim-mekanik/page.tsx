import { HardHat } from "lucide-react";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormMekanik } from "./FormMekanik";

// Definisi "WO aktif" sama dengan dashboard_beban_mekanik di dashboard.sql
const STATUS_AKTIF = ["dikerjakan", "tertunda", "selesai"];

export default async function HalamanTimMekanik() {
  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  const [{ data: kepala }, { data: mekanik }, { data: penugasan }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nama")
      .eq("role", "kepala_mekanik")
      .eq("aktif", true)
      .order("nama"),
    supabase.from("mekanik").select("id, nama, aktif, kepala_mekanik_id").order("nama"),
    // Hanya penugasan di WO aktif; jumlahnya dibatasi kapasitas bengkel, bukan umur data.
    supabase
      .from("work_order_mekanik")
      .select("mekanik_id, work_orders!inner(status)")
      .in("work_orders.status", STATUS_AKTIF),
  ]);

  const woAktif = new Map<string, number>();
  penugasan?.forEach((p) => woAktif.set(p.mekanik_id, (woAktif.get(p.mekanik_id) ?? 0) + 1));

  const tim = kepala ?? [];
  // Owner mengelola semua tim; Kepala Mekanik hanya timnya sendiri (dijaga juga oleh RLS mekanik_ubah).
  const bolehKelola = (kepalaId: string) =>
    profil.peran === "owner" || (profil.peran === "kepala_mekanik" && profil.id === kepalaId);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Tim Mekanik
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Kelola daftar regu mekanik, penempatan tim, dan pantau beban pengerjaan aktif
          </p>
        </div>
      </div>

      {tim.length === 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-8 text-center text-xs text-zinc-500">
          Belum ada Kepala Mekanik yang aktif terdaftar di sistem.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {tim.map((k) => {
          const anggota = (mekanik ?? []).filter((m) => m.kepala_mekanik_id === k.id);
          return (
            <div
              key={k.id}
              className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden flex flex-col justify-between"
            >
              {/* Header Kartu Tim */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 p-4 sm:p-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <HardHat className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Tim {k.nama}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {anggota.length} anggota mekanik terdaftar
                    </p>
                  </div>
                </div>

                {bolehKelola(k.id) && <FormMekanik kepalaId={k.id} />}
              </div>

              {/* Konten Daftar Anggota Tim */}
              <div className="p-4 sm:p-5 flex-1">
                {anggota.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-500">
                    Belum ada mekanik yang ditugaskan di tim ini.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-800/60">
                    {anggota.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 py-3 px-2 rounded-lg transition-colors hover:bg-zinc-800/30"
                      >
                        <span
                          className={
                            m.aktif
                              ? "flex-1 text-sm font-medium text-white"
                              : "flex-1 text-sm text-zinc-500 line-through"
                          }
                        >
                          {m.nama}
                        </span>

                        {!m.aktif && (
                          <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-[10px] font-medium text-rose-400">
                            Nonaktif
                          </span>
                        )}

                        <span className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-xs font-mono font-medium text-primary">
                          {woAktif.get(m.id) ?? 0} WO aktif
                        </span>

                        {bolehKelola(k.id) && (
                          <FormMekanik
                            kepalaId={k.id}
                            mekanik={m}
                            pilihanTim={profil.peran === "owner" ? tim : undefined}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
