import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { Paginasi } from "@/components/Paginasi";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { LABEL_PERAN, type Peran } from "@/lib/peran";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Pengguna</h1>
          <p className="text-sm text-text-muted">
            Kelola nama, peran, dan status aktif akun pengguna sistem bengkel.
          </p>
        </div>
      </div>

      {/* Pencarian */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cari nama atau email..."
            className="pl-9"
          />
        </form>
      </div>

      {/* Tabel Pengguna */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Pengguna</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Peran</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Dibuat Pada</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pengguna ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-text-muted">
                  Tidak ada pengguna yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              (pengguna ?? []).map((u) => {
                let badgePeran = <Badge variant="outline">{u.role}</Badge>;
                if (u.role === "owner") {
                  badgePeran = (
                    <Badge variant="outline" className="border-indigo-600/30 bg-indigo-50 text-indigo-700">
                      {LABEL_PERAN.owner}
                    </Badge>
                  );
                } else if (u.role === "admin") {
                  badgePeran = (
                    <Badge variant="outline" className="border-sky-600/30 bg-sky-50 text-sky-700">
                      {LABEL_PERAN.admin}
                    </Badge>
                  );
                } else if (u.role === "kepala_mekanik") {
                  badgePeran = (
                    <Badge variant="outline" className="border-amber-600/30 bg-amber-50 text-amber-700">
                      {LABEL_PERAN.kepala_mekanik}
                    </Badge>
                  );
                }

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-text">
                      {u.nama}
                      {u.id === profil.id && (
                        <span className="ml-2 text-xs text-text-muted">(Anda)</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-text-muted">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-center">{badgePeran}</TableCell>
                    <TableCell className="text-center">
                      {u.aktif ? (
                        <Badge variant="outline" className="border-emerald-600/30 bg-emerald-50 text-emerald-700">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-600/30 bg-rose-50 text-rose-700">
                          Nonaktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-text-muted">
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
      </Card>

      <Paginasi
        halaman={halaman}
        totalBaris={count ?? 0}
        perHalaman={PER_HALAMAN}
        params={{ q }}
      />
    </div>
  );
}
