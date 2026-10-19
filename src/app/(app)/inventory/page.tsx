import Link from "next/link";
import { Search } from "lucide-react";
import { Paginasi } from "@/components/Paginasi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">Inventory</h1>
          {canManage && <FormItem jenis="part" isOwner={isOwner} />}
        </div>

        {/* Tab Navigasi */}
        <div className="flex border-b border-border text-sm font-medium">
          <Link
            href="/inventory?tab=part"
            className="border-b-2 border-primary px-4 py-2.5 font-semibold text-primary"
          >
            Spare Part
          </Link>
          <Link
            href="/inventory?tab=jasa"
            className="border-b-2 border-transparent px-4 py-2.5 text-text-muted hover:text-text"
          >
            Jasa
          </Link>
          <Link
            href="/inventory?tab=riwayat"
            className="border-b-2 border-transparent px-4 py-2.5 text-text-muted hover:text-text"
          >
            Riwayat Stok
          </Link>
        </div>

        {/* Pencarian dan Penyaring */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="relative flex-1 sm:max-w-xs">
            <input type="hidden" name="tab" value="part" />
            {status && <input type="hidden" name="status" value={status} />}
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Cari nama atau SKU..."
              className="pl-9"
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
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    aktif
                      ? "bg-primary text-white"
                      : "bg-bg-app text-text-muted hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tabel Spare Part */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">SKU</TableHead>
                <TableHead>Nama Spare Part</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                {isOwner && <TableHead className="text-right">Harga Modal</TableHead>}
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isOwner ? 8 : 7}
                    className="h-28 text-center text-text-muted"
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
                    <Badge variant="outline" className="border-emerald-600/30 bg-emerald-50 text-emerald-700">
                      Aman
                    </Badge>
                  );
                  if (item.stok === 0) {
                    statusBadge = (
                      <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                        Habis
                      </Badge>
                    );
                  } else if (item.stok <= item.stok_minimum) {
                    statusBadge = (
                      <Badge variant="outline" className="border-amber-600/30 bg-amber-50 text-amber-700">
                        Menipis
                      </Badge>
                    );
                  }

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs font-semibold text-text-muted">
                        {item.kode}
                      </TableCell>
                      <TableCell className="font-medium text-text">{item.nama}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-text">
                        {item.stok}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-text-muted">
                        {item.stok_minimum}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-text">
                        {rupiah(item.harga_jual)}
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-right tabular-nums text-text-muted">
                          {modal !== null ? (
                            rupiah(modal)
                          ) : (
                            <span className="text-xs italic text-amber-600">Belum diisi</span>
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
        </Card>

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">Inventory</h1>
          {canManage && <FormItem jenis="jasa" isOwner={isOwner} />}
        </div>

        {/* Tab Navigasi */}
        <div className="flex border-b border-border text-sm font-medium">
          <Link
            href="/inventory?tab=part"
            className="border-b-2 border-transparent px-4 py-2.5 text-text-muted hover:text-text"
          >
            Spare Part
          </Link>
          <Link
            href="/inventory?tab=jasa"
            className="border-b-2 border-primary px-4 py-2.5 font-semibold text-primary"
          >
            Jasa
          </Link>
          <Link
            href="/inventory?tab=riwayat"
            className="border-b-2 border-transparent px-4 py-2.5 text-text-muted hover:text-text"
          >
            Riwayat Stok
          </Link>
        </div>

        {/* Pencarian */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form className="relative flex-1 sm:max-w-xs">
            <input type="hidden" name="tab" value="jasa" />
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Cari kode atau nama jasa..."
              className="pl-9"
            />
          </form>
        </div>

        {/* Tabel Jasa */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Kode Jasa</TableHead>
                <TableHead>Nama Layanan Jasa</TableHead>
                <TableHead className="text-right">Tarif Jasa</TableHead>
                {isOwner && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isOwner ? 4 : 3} className="h-28 text-center text-text-muted">
                    Tidak ada layanan jasa yang sesuai.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs font-semibold text-text-muted">
                      {item.kode}
                    </TableCell>
                    <TableCell className="font-medium text-text">{item.nama}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-text">
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
        </Card>

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Inventory</h1>
      </div>

      {/* Tab Navigasi */}
      <div className="flex border-b border-border text-sm font-medium">
        <Link
          href="/inventory?tab=part"
          className="border-b-2 border-transparent px-4 py-2.5 text-text-muted hover:text-text"
        >
          Spare Part
        </Link>
        <Link
          href="/inventory?tab=jasa"
          className="border-b-2 border-transparent px-4 py-2.5 text-text-muted hover:text-text"
        >
          Jasa
        </Link>
        <Link
          href="/inventory?tab=riwayat"
          className="border-b-2 border-primary px-4 py-2.5 font-semibold text-primary"
        >
          Riwayat Stok
        </Link>
      </div>

      {/* Tabel Riwayat Stok */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Waktu</TableHead>
              <TableHead>Spare Part</TableHead>
              <TableHead className="text-center">Jenis</TableHead>
              <TableHead className="text-right">Perubahan</TableHead>
              <TableHead className="text-right">Stok Akhir</TableHead>
              <TableHead>Keterangan / Ref</TableHead>
              <TableHead>Pencatat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-text-muted">
                  Belum ada pergerakan stok tercatat.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m) => {
                let badgeJenis = <Badge variant="outline">{m.jenis}</Badge>;
                if (m.jenis === "masuk") {
                  badgeJenis = (
                    <Badge variant="outline" className="border-emerald-600/30 bg-emerald-50 text-emerald-700">
                      Masuk
                    </Badge>
                  );
                } else if (m.jenis === "keluar") {
                  badgeJenis = (
                    <Badge variant="outline" className="border-rose-600/30 bg-rose-50 text-rose-700">
                      Keluar
                    </Badge>
                  );
                } else if (m.jenis === "penyesuaian") {
                  badgeJenis = (
                    <Badge variant="outline" className="border-amber-600/30 bg-amber-50 text-amber-700">
                      Penyesuaian
                    </Badge>
                  );
                } else if (m.jenis === "kembali") {
                  badgeJenis = (
                    <Badge variant="outline" className="border-blue-600/30 bg-blue-50 text-blue-700">
                      Kembali
                    </Badge>
                  );
                }

                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-text-muted">
                      {tanggal(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-text">
                        {m.inventory_items?.nama ?? "-"}
                      </span>
                      <span className="ml-2 font-mono text-xs text-text-muted">
                        ({m.inventory_items?.kode ?? "-"})
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{badgeJenis}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      <span className={m.jumlah > 0 ? "text-emerald-700" : "text-rose-700"}>
                        {m.jumlah > 0 ? `+${m.jumlah}` : m.jumlah}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-text">
                      {m.stok_sesudah}
                    </TableCell>
                    <TableCell className="text-sm text-text-muted">
                      {m.keterangan || (m.work_orders?.nomor ? `WO: ${m.work_orders.nomor}` : "-")}
                    </TableCell>
                    <TableCell className="text-sm text-text-muted">
                      {m.profiles?.nama ?? "-"}
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
        params={{ tab: "riwayat" }}
      />
    </div>
  );
}
