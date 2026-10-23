import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { Paginasi } from "@/components/Paginasi";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tanggal } from "@/lib/format";
import { LABEL_PERAN } from "@/lib/peran";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormPengguna } from "./FormPengguna";

const PER_HALAMAN = 20;

export default async function HalamanPengguna({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hal?: string }>;
}) {
  const profil = await ambilProfilSaya();

  // Route guard: Hanya Owner yang boleh mengakses halaman ini (PRD 6.10)
  if (profil.peran !== "owner") {
    redirect("/dashboard");
  }

  const { q = "", hal } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);
  const cari = q.replace(/[,()*%\\]/g, " ").trim();

  const supabase = await createClient();

  let kueri = supabase
    .from("profiles")
    .select("id, nama, email, role, aktif, created_at", { count: "exact" });

  if (cari) {
    kueri = kueri.or(`nama.ilike.%${cari}%,email.ilike.%${cari}%`);
  }

  const { data: pengguna, count } = await kueri
    .order("created_at", { ascending: false })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Pengguna
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Kelola nama, hak peran, dan status aktif akun pengguna sistem bengkel
          </p>
        </div>
      </div>

      {/* Pencarian */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cari nama atau email..."
            className="pl-9 text-xs border-zinc-800 bg-[#111116] text-white placeholder:text-zinc-500 focus-visible:border-primary/50"
          />
        </form>
      </div>

      {/* Tabel Pengguna */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
            <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Nama Pengguna</TableHead>
              <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-center text-zinc-400 font-semibold text-xs uppercase tracking-wider">Peran</TableHead>
              <TableHead className="text-center text-zinc-400 font-semibold text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Dibuat Pada</TableHead>
              <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-800/60">
            {(pengguna ?? []).length === 0 ? (
              <TableRow className="border-b border-zinc-800/60 hover:bg-transparent">
                <TableCell colSpan={6} className="h-28 text-center text-xs text-zinc-500">
                  Tidak ada pengguna yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              (pengguna ?? []).map((u) => {
                let badgePeran = (
                  <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                    {u.role}
                  </span>
                );
                if (u.role === "owner") {
                  badgePeran = (
                    <span className="inline-flex items-center rounded-full border border-pink-500/30 bg-pink-950/40 px-2.5 py-0.5 text-[11px] font-medium text-pink-300">
                      {LABEL_PERAN.owner}
                    </span>
                  );
                } else if (u.role === "admin") {
                  badgePeran = (
                    <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-950/40 px-2.5 py-0.5 text-[11px] font-medium text-sky-400">
                      {LABEL_PERAN.admin}
                    </span>
                  );
                } else if (u.role === "kepala_mekanik") {
                  badgePeran = (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                      {LABEL_PERAN.kepala_mekanik}
                    </span>
                  );
                }

                return (
                  <TableRow key={u.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                    <TableCell className="font-medium text-white">
                      {u.nama}
                      {u.id === profil.id && (
                        <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          (Anda)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-400">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-center">{badgePeran}</TableCell>
                    <TableCell className="text-center">
                      {u.aktif ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-950/40 px-2.5 py-0.5 text-[11px] font-medium text-rose-400">
                          Nonaktif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-zinc-400">
                      {tanggal(u.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <FormPengguna target={u} currentUserId={profil.id} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Paginasi
        halaman={halaman}
        totalBaris={count ?? 0}
        perHalaman={PER_HALAMAN}
        params={{ q }}
      />
    </div>
  );
}
