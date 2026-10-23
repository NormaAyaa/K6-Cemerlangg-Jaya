import Link from "next/link";
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
import { rupiah, tanggal } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { DialogSesuaikanStok } from "./DialogSesuaikanStok";
import { DialogStokMasuk } from "./DialogStokMasuk";
import { FormItem } from "./FormItem";

const PER_HALAMAN = 20;

export default async function HalamanInventory({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    hal?: string;
  }>;
}) {
  const { tab = "part", q = "", status = "", hal } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);
  const cari = q.replace(/[,()*%\\]/g, " ").trim();

  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  const isOwner = profil.peran === "owner";
  const canManage = profil.peran === "owner" || profil.peran === "admin";

  // ==========================================
  // TAB 1: SPARE PART
  // ==========================================
  if (tab === "part") {
    // Egress & Security: inventory_costs HANYA di-query jika user adalah Owner
    const kolomSelect = isOwner
      ? "id, kode, nama, jenis, stok, stok_minimum, harga_jual, inventory_costs(harga_modal)"
      : "id, kode, nama, jenis, stok, stok_minimum, harga_jual";

    let kueri = supabase
      .from("inventory_items")
      .select(kolomSelect, { count: "exact" })
      .eq("jenis", "part");

    if (cari) {
      kueri = kueri.or(`nama.ilike.%${cari}%,kode.ilike.%${cari}%`);
    }

    if (status === "habis") {
      kueri = kueri.eq("stok", 0);
    }

    const { data: rawItems, count } = await kueri
      .order("kode")
      .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

    type ItemPart = {
      id: string;
      kode: string;
      nama: string;
      jenis: string;
      stok: number;
      stok_minimum: number;
      harga_jual: number;
      inventory_costs?: { harga_modal: number } | { harga_modal: number }[] | null;
    };

    const items = (rawItems ?? []) as unknown as ItemPart[];

    // Filter status "menipis" & "aman" di sisi data per halaman bila dipilih
    const filteredItems = items.filter((item) => {
      if (status === "menipis") return item.stok > 0 && item.stok <= item.stok_minimum;
      if (status === "aman") return item.stok > item.stok_minimum;
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Inventory
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Katalog spare part, tarif layanan jasa, dan riwayat mutasi stok bengkel
            </p>
          </div>
          {canManage && <FormItem jenis="part" isOwner={isOwner} />}
        </div>

        {/* Tab Navigasi */}
        <div className="flex border-b border-zinc-800/80 text-sm font-medium gap-2">
          <Link
            href="/inventory?tab=part"
            className="border-b-2 border-primary px-4 py-2.5 font-semibold text-white transition-colors shadow-[0_1px_0_0_#FF2E75]"
          >
            Spare Part
          </Link>
          <Link
            href="/inventory?tab=jasa"
            className="border-b-2 border-transparent px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Jasa
          </Link>
          <Link
            href="/inventory?tab=riwayat"
            className="border-b-2 border-transparent px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Riwayat Stok
          </Link>
        </div>

        {/* Pencarian dan Penyaring */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="relative flex-1 sm:max-w-xs">
            <input type="hidden" name="tab" value="part" />
            {status && <input type="hidden" name="status" value={status} />}
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Cari nama atau SKU..."
              className="pl-9 text-xs border-zinc-800 bg-[#111116] text-white placeholder:text-zinc-500 focus-visible:border-primary/50"
            />
          </form>

          {/* Filter Status Badge */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: "", label: "Semua" },
              { id: "aman", label: "Aman" },
              { id: "menipis", label: "Menipis" },
              { id: "habis", label: "Habis" },
            ].map((f) => {
              const aktif = status === f.id;
              const sp = new URLSearchParams();
              sp.set("tab", "part");
              if (q) sp.set("q", q);
              if (f.id) sp.set("status", f.id);
              return (
                <Link
                  key={f.id}
                  href={`?${sp}`}
                  className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                    aktif
                      ? "bg-primary text-white font-semibold shadow-[0_0_12px_rgba(255,46,117,0.35)]"
                      : "border border-zinc-800 bg-[#111116] text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tabel Spare Part */}
        <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
              <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
                <TableHead className="w-24 text-zinc-400 font-semibold text-xs uppercase tracking-wider">SKU</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Nama Spare Part</TableHead>
                <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Stok</TableHead>
                <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Min</TableHead>
                <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Harga Jual</TableHead>
                {isOwner && <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Harga Modal</TableHead>}
                <TableHead className="text-center text-zinc-400 font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-800/60">
              {filteredItems.length === 0 ? (
                <TableRow className="border-b border-zinc-800/60 hover:bg-transparent">
                  <TableCell
                    colSpan={isOwner ? 8 : 7}
                    className="h-28 text-center text-xs text-zinc-500"
                  >
                    Tidak ada spare part yang sesuai.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  let modal: number | null = null;
                  if (isOwner && item.inventory_costs) {
                    modal = Array.isArray(item.inventory_costs)
                      ? item.inventory_costs[0]?.harga_modal ?? null
                      : item.inventory_costs.harga_modal ?? null;
                  }

                  let statusBadge = (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                      Aman
                    </span>
                  );
                  if (item.stok === 0) {
                    statusBadge = (
                      <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-950/40 px-2.5 py-0.5 text-[11px] font-medium text-rose-400">
                        Habis
                      </span>
                    );
                  } else if (item.stok <= item.stok_minimum) {
                    statusBadge = (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                        Menipis
                      </span>
                    );
                  }

                  return (
                    <TableRow key={item.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-zinc-400">
                        {item.kode}
                      </TableCell>
                      <TableCell className="font-medium text-white">{item.nama}</TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-white">
                        {item.stok}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-500">
                        {item.stok_minimum}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-zinc-200">
                        {rupiah(item.harga_jual)}
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-right tabular-nums text-zinc-400">
                          {modal !== null ? (
                            rupiah(modal)
                          ) : (
                            <span className="text-xs italic text-amber-400/90">Belum diisi</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center">{statusBadge}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <DialogStokMasuk
                              item={{ id: item.id, nama: item.nama, stok: item.stok }}
                            />
                          )}
                          {isOwner && (
                            <DialogSesuaikanStok
                              item={{ id: item.id, nama: item.nama, stok: item.stok }}
                            />
                          )}
                          {isOwner && (
                            <FormItem
                              jenis="part"
                              isOwner={isOwner}
                              item={{
                                id: item.id,
                                kode: item.kode,
                                nama: item.nama,
                                jenis: item.jenis,
                                harga_jual: item.harga_jual,
                                stok_minimum: item.stok_minimum,
                                harga_modal: modal,
                              }}
                            />
                          )}
                        </div>
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
          params={{ tab: "part", q, status }}
        />
      </div>
    );
  }

  // ==========================================
  // TAB 2: JASA
  // ==========================================
  if (tab === "jasa") {
    let kueri = supabase
      .from("inventory_items")
      .select("id, kode, nama, jenis, harga_jual", { count: "exact" })
      .eq("jenis", "jasa");

    if (cari) {
      kueri = kueri.or(`nama.ilike.%${cari}%,kode.ilike.%${cari}%`);
    }

    const { data: rawItems, count } = await kueri
      .order("kode")
      .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

    type ItemJasa = {
      id: string;
      kode: string;
      nama: string;
      jenis: string;
      harga_jual: number;
    };

    const items = (rawItems ?? []) as unknown as ItemJasa[];

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Inventory
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Katalog spare part, tarif layanan jasa, dan riwayat mutasi stok bengkel
            </p>
          </div>
          {canManage && <FormItem jenis="jasa" isOwner={isOwner} />}
        </div>

        {/* Tab Navigasi */}
        <div className="flex border-b border-zinc-800/80 text-sm font-medium gap-2">
          <Link
            href="/inventory?tab=part"
            className="border-b-2 border-transparent px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Spare Part
          </Link>
          <Link
            href="/inventory?tab=jasa"
            className="border-b-2 border-primary px-4 py-2.5 font-semibold text-white transition-colors shadow-[0_1px_0_0_#FF2E75]"
          >
            Jasa
          </Link>
          <Link
            href="/inventory?tab=riwayat"
            className="border-b-2 border-transparent px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            Riwayat Stok
          </Link>
        </div>

        {/* Pencarian */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="relative flex-1 sm:max-w-xs">
            <input type="hidden" name="tab" value="jasa" />
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Cari kode atau nama jasa..."
              className="pl-9 text-xs border-zinc-800 bg-[#111116] text-white placeholder:text-zinc-500 focus-visible:border-primary/50"
            />
          </form>
        </div>

        {/* Tabel Jasa */}
        <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
              <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
                <TableHead className="w-28 text-zinc-400 font-semibold text-xs uppercase tracking-wider">Kode Jasa</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Nama Layanan Jasa</TableHead>
                <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Tarif Jasa</TableHead>
                {isOwner && <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-800/60">
              {items.length === 0 ? (
                <TableRow className="border-b border-zinc-800/60 hover:bg-transparent">
                  <TableCell colSpan={isOwner ? 4 : 3} className="h-28 text-center text-xs text-zinc-500">
                    Tidak ada layanan jasa yang sesuai.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-zinc-400">
                      {item.kode}
                    </TableCell>
                    <TableCell className="font-medium text-white">{item.nama}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-zinc-200">
                      {rupiah(item.harga_jual)}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        <FormItem
                          jenis="jasa"
                          isOwner={isOwner}
                          item={{
                            id: item.id,
                            kode: item.kode,
                            nama: item.nama,
                            jenis: item.jenis,
                            harga_jual: item.harga_jual,
                          }}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Paginasi
          halaman={halaman}
          totalBaris={count ?? 0}
          perHalaman={PER_HALAMAN}
          params={{ tab: "jasa", q }}
        />
      </div>
    );
  }

  // ==========================================
  // TAB 3: RIWAYAT STOK
  // ==========================================
  const { data: rawMovements, count } = await supabase
    .from("stock_movements")
    .select(
      "id, created_at, jenis, jumlah, stok_sesudah, keterangan, inventory_items(kode, nama), work_orders(nomor), profiles(nama)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

  type Movement = {
    id: number;
    created_at: string;
    jenis: string;
    jumlah: number;
    stok_sesudah: number;
    keterangan: string | null;
    inventory_items: { kode: string; nama: string } | null;
    work_orders: { nomor: string } | null;
    profiles: { nama: string } | null;
  };

  const movements = (rawMovements ?? []) as unknown as Movement[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Inventory
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Katalog spare part, tarif layanan jasa, dan riwayat mutasi stok bengkel
          </p>
        </div>
      </div>

      {/* Tab Navigasi */}
      <div className="flex border-b border-zinc-800/80 text-sm font-medium gap-2">
        <Link
          href="/inventory?tab=part"
          className="border-b-2 border-transparent px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
        >
          Spare Part
        </Link>
        <Link
          href="/inventory?tab=jasa"
          className="border-b-2 border-transparent px-4 py-2.5 text-zinc-400 hover:text-white transition-colors"
        >
          Jasa
        </Link>
        <Link
          href="/inventory?tab=riwayat"
          className="border-b-2 border-primary px-4 py-2.5 font-semibold text-white transition-colors shadow-[0_1px_0_0_#FF2E75]"
        >
          Riwayat Stok
        </Link>
      </div>

      {/* Tabel Riwayat Stok */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/80">
            <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
              <TableHead className="w-36 text-zinc-400 font-semibold text-xs uppercase tracking-wider">Waktu</TableHead>
              <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Spare Part</TableHead>
              <TableHead className="text-center text-zinc-400 font-semibold text-xs uppercase tracking-wider">Jenis</TableHead>
              <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Perubahan</TableHead>
              <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">Stok Akhir</TableHead>
              <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Keterangan / Ref</TableHead>
              <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Pencatat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-800/60">
            {movements.length === 0 ? (
              <TableRow className="border-b border-zinc-800/60 hover:bg-transparent">
                <TableCell colSpan={7} className="h-28 text-center text-xs text-zinc-500">
                  Belum ada pergerakan stok tercatat.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m) => {
                let badgeJenis = (
                  <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] font-medium text-zinc-300">
                    {m.jenis}
                  </span>
                );
                if (m.jenis === "masuk") {
                  badgeJenis = (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      Masuk
                    </span>
                  );
                } else if (m.jenis === "keluar") {
                  badgeJenis = (
                    <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-950/40 px-2.5 py-0.5 text-[10px] font-medium text-rose-400">
                      Keluar
                    </span>
                  );
                } else if (m.jenis === "penyesuaian") {
                  badgeJenis = (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
                      Penyesuaian
                    </span>
                  );
                } else if (m.jenis === "kembali") {
                  badgeJenis = (
                    <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-950/40 px-2.5 py-0.5 text-[10px] font-medium text-blue-400">
                      Kembali
                    </span>
                  );
                }

                return (
                  <TableRow key={m.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                    <TableCell className="text-xs text-zinc-400">
                      {tanggal(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-white">
                        {m.inventory_items?.nama ?? "-"}
                      </span>
                      <span className="ml-2 font-mono text-xs text-zinc-500">
                        ({m.inventory_items?.kode ?? "-"})
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{badgeJenis}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      <span className={m.jumlah > 0 ? "text-emerald-400" : "text-rose-400"}>
                        {m.jumlah > 0 ? `+${m.jumlah}` : m.jumlah}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-white">
                      {m.stok_sesudah}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {m.keterangan || (m.work_orders?.nomor ? `WO: ${m.work_orders.nomor}` : "-")}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {m.profiles?.nama ?? "-"}
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
        params={{ tab: "riwayat" }}
      />
    </div>
  );
}
