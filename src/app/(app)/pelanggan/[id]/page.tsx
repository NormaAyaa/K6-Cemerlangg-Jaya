import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BadgeStatus } from "@/components/BadgeStatus";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tanggal } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { FormKendaraan } from "../FormKendaraan";
import { FormPelanggan } from "../FormPelanggan";
import { TombolHapus } from "../TombolHapus";

// ponytail: riwayat dibatasi 50 WO terbaru; tambahkan paginasi bila ada pelanggan armada dengan ratusan WO.
// ponytail: history capped at the newest 50 WOs; add pagination if fleet customers reach hundreds of WOs.
const BATAS_RIWAYAT = 50;

export default async function RincianPelanggan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // Tiga kueri independen dijalankan bersamaan / Three independent queries run in parallel
  const [{ data: pelanggan }, { data: kendaraan }, { data: riwayat }] = await Promise.all([
    supabase.from("customers").select("id, tipe, nama, telepon, email, alamat").eq("id", id).maybeSingle(),
    supabase
      .from("vehicles")
      .select("id, plat, merek_model, tahun, warna, transmisi")
      .eq("customer_id", id)
      .order("created_at"),
    supabase
      .from("work_orders")
      .select("id, nomor, status, created_at, vehicles(plat)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(BATAS_RIWAYAT),
  ]);

  // id yang bukan uuid juga berakhir di sini karena kuerinya gagal / Non-uuid ids also land here because the query fails
  if (!pelanggan) notFound();

  const bolehUbah = profil.peran === "admin" || profil.peran === "owner";

  return (
    <div className="space-y-6">
      {/* Navigasi Kembali */}
      <Link
        href="/pelanggan"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Kembali ke Daftar Pelanggan
      </Link>

      {/* Kartu Profil Pelanggan */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/25 text-primary font-bold text-lg">
              {pelanggan.nama.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {pelanggan.nama}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                    pelanggan.tipe === "perusahaan"
                      ? "border-blue-500/30 bg-blue-950/40 text-blue-400"
                      : "border-zinc-700 bg-zinc-800/80 text-zinc-300"
                  )}
                >
                  {pelanggan.tipe === "perusahaan" ? "Perusahaan" : "Perorangan"}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 font-mono">
                ID Pelanggan: {pelanggan.id}
              </p>
            </div>
          </div>

          {bolehUbah && (
            <div className="flex items-center gap-2">
              <FormPelanggan pelanggan={pelanggan} />
              <TombolHapus jenis="pelanggan" id={pelanggan.id} nama={pelanggan.nama} sesudahnya="/pelanggan" />
            </div>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Tipe Pelanggan" isi={pelanggan.tipe === "perusahaan" ? "Perusahaan" : "Perorangan"} />
          <Info label="Nomor Telepon" isi={pelanggan.telepon} isMono />
          <Info label="Email" isi={pelanggan.email} />
          <Info label="Alamat Domisili" isi={pelanggan.alamat} />
        </dl>
      </div>

      {/* Tabs Kendaraan dan Riwayat */}
      <Tabs defaultValue="kendaraan" className="space-y-4">
        <div className="flex border-b border-zinc-800/80">
          <TabsList className="bg-transparent p-0 gap-2 h-auto">
            <TabsTrigger
              value="kendaraan"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-400 data-active:border-primary data-active:text-white data-active:bg-transparent shadow-none transition-colors"
            >
              Kendaraan Terdaftar ({kendaraan?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="riwayat"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-400 data-active:border-primary data-active:text-white data-active:bg-transparent shadow-none transition-colors"
            >
              Riwayat Servis ({riwayat?.length ?? 0})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Kendaraan */}
        <TabsContent value="kendaraan" className="space-y-4 mt-0">
          {bolehUbah && (
            <div className="flex justify-end">
              <FormKendaraan customerId={pelanggan.id} />
            </div>
          )}
          <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
                <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
                  <TableHead className="pl-4 text-zinc-400 font-semibold text-xs uppercase tracking-wider">Plat Nomor</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Merek dan Model</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Tahun</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Warna</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Transmisi</TableHead>
                  {bolehUbah && <TableHead className="pr-4 text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-800/60 text-xs">
                {kendaraan?.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="py-10 text-center text-zinc-500 font-mono">
                      Belum ada kendaraan yang didaftarkan untuk pelanggan ini.
                    </TableCell>
                  </TableRow>
                )}
                {kendaraan?.map((k) => (
                  <TableRow key={k.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <TableCell className="pl-4">
                      <span className="font-mono text-xs font-semibold text-white bg-zinc-800/90 border border-zinc-700/60 px-2 py-0.5 rounded tracking-wider">
                        {k.plat}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-white">{k.merek_model}</TableCell>
                    <TableCell className="tabular-nums font-mono text-zinc-300">{k.tahun ?? "-"}</TableCell>
                    <TableCell className="text-zinc-300">{k.warna ?? "-"}</TableCell>
                    <TableCell>
                      {k.transmisi ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 border border-zinc-700 text-zinc-300">
                          {k.transmisi}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    {bolehUbah && (
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <FormKendaraan customerId={pelanggan.id} kendaraan={k} />
                          <TombolHapus jenis="kendaraan" id={k.id} nama={k.plat} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 2: Riwayat Servis */}
        <TabsContent value="riwayat" className="space-y-4 mt-0">
          <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
                <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
                  <TableHead className="pl-4 text-zinc-400 font-semibold text-xs uppercase tracking-wider">No WO</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Tanggal</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Plat Kendaraan</TableHead>
                  <TableHead className="pr-4 text-zinc-400 font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-zinc-800/60 text-xs">
                {riwayat?.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="py-10 text-center text-zinc-500 font-mono">
                      Belum ada riwayat servis untuk pelanggan ini.
                    </TableCell>
                  </TableRow>
                )}
                {riwayat?.map((wo) => (
                  <TableRow key={wo.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <TableCell className="pl-4 font-mono font-semibold">
                      <Link href={`/work-orders/${wo.id}`} className="text-primary hover:underline">
                        {wo.nomor}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-zinc-300">{tanggal(wo.created_at)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-white bg-zinc-800 px-1.5 py-0.5 rounded">
                        {wo.vehicles?.plat ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <BadgeStatus status={wo.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, isi, isMono = false }: { label: string; isi: string | null; isMono?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3">
      <dt className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className={cn("mt-1 text-xs font-medium text-zinc-200 truncate", isMono && "font-mono")}>
        {isi || "-"}
      </dd>
    </div>
  );
}
