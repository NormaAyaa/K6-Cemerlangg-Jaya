import Link from "next/link";
import { Search } from "lucide-react";
import { Paginasi } from "@/components/Paginasi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tanggal } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormPelanggan } from "./FormPelanggan";

const PER_HALAMAN = 20;

export default async function HalamanPelanggan({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hal?: string }>;
}) {
  const { q = "", hal } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);
  // Koma, kurung, dan bintang punya arti khusus di filter .or() PostgREST / Commas, parentheses and asterisks are syntax inside PostgREST .or()
  const cari = q.replace(/[,()*%\\]/g, " ").trim();

  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // Hanya kolom yang tampil. Jumlah kendaraan dihitung database, servis terakhir cukup 1 WO terbaru per pelanggan.
  // Only displayed columns. Vehicle count is computed by the database; last service needs just the newest WO per customer.
  let kueri = supabase
    .from("customers")
    .select("id, nama, telepon, vehicles(count), work_orders(created_at)", { count: "exact" });

  if (cari) {
    // Pencarian plat lewat tabel vehicles, lalu digabung dengan nama dan telepon / Plate search goes through vehicles, then joins name and phone
    const { data: cocokPlat } = await supabase
      .from("vehicles")
      .select("customer_id")
      .ilike("plat", `%${cari}%`)
      .limit(50);
    const syarat = [`nama.ilike.%${cari}%`, `telepon.ilike.%${cari}%`];
    const ids = [...new Set((cocokPlat ?? []).map((v) => v.customer_id))];
    if (ids.length) syarat.push(`id.in.(${ids.join(",")})`);
    kueri = kueri.or(syarat.join(","));
  }

  const { data: pelanggan, count, error } = await kueri
    .order("nama")
    .order("created_at", { referencedTable: "work_orders", ascending: false })
    .limit(1, { referencedTable: "work_orders" })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

  const bolehUbah = profil.peran === "admin" || profil.peran === "owner";

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Pelanggan
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Daftar pelanggan, kepemilikan armada kendaraan, dan riwayat kunjungan servis
          </p>
        </div>
        {bolehUbah && <FormPelanggan />}
      </div>

      {/* Pencarian */}
      <form method="GET" action="/pelanggan" className="flex flex-wrap items-center gap-3" role="search">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cari nama, telepon, atau plat kendaraan..."
            aria-label="Cari pelanggan"
            className="pl-9 text-xs border-zinc-800 bg-[#111116] text-white placeholder:text-zinc-500 focus-visible:border-primary/50"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs gap-1.5 h-9"
        >
          <Search className="size-3.5 text-primary" />
          Cari
        </Button>
      </form>

      {/* Tabel Pelanggan */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
            <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
              <TableHead className="pl-4 text-zinc-400 font-semibold text-xs uppercase tracking-wider">Nama</TableHead>
              <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Telepon</TableHead>
              <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Jumlah Kendaraan</TableHead>
              <TableHead className="pr-4 text-zinc-400 font-semibold text-xs uppercase tracking-wider">Servis Terakhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-800/60 text-xs">
            {error && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-10 text-center text-rose-400 font-mono">
                  Data pelanggan gagal dimuat. Muat ulang halaman ini.
                </TableCell>
              </TableRow>
            )}
            {!error && pelanggan?.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-10 text-center text-zinc-500 font-mono">
                  {cari ? `Tidak ada pelanggan yang cocok dengan "${cari}".` : "Belum ada pelanggan terdaftar."}
                </TableCell>
              </TableRow>
            )}
            {pelanggan?.map((p) => (
              <TableRow key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <TableCell className="pl-4 font-medium">
                  <Link href={`/pelanggan/${p.id}`} className="text-primary hover:underline font-semibold">
                    {p.nama}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums font-mono text-zinc-300">{p.telepon}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                    {p.vehicles[0]?.count ?? 0} unit
                  </span>
                </TableCell>
                <TableCell className="pr-4 font-mono text-zinc-400">
                  {p.work_orders[0] ? tanggal(p.work_orders[0].created_at) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Paginasi halaman={halaman} totalBaris={count ?? 0} perHalaman={PER_HALAMAN} params={{ q: cari }} />
    </div>
  );
}
