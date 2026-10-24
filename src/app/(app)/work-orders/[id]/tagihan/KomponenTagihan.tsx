"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  CreditCard,
  Percent,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { rupiah, tanggal } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export interface ItemTagihan {
  id: string;
  item_id: string;
  nama_item: string;
  jenis: "part" | "jasa";
  jumlah: number;
  harga_master: number;
  harga_dipakai: number;
  alasan_penyesuaian: string | null;
  disesuaikan_at: string | null;
  disesuaikan_oleh: string | null;
  nama_pengubah?: string | null;
  harga_modal?: number;
}

export interface InvoiceData {
  id: string;
  nomor: string;
  subtotal: number;
  diskon: number;
  total: number;
  terbayar: number;
  status_bayar: "belum_bayar" | "sebagian" | "lunas";
  diterbitkan_at: string;
}

export interface PaymentData {
  id: string;
  metode: string;
  jumlah: number;
  created_at: string;
  nama_pencatat?: string | null;
}

export interface InventoryOption {
  id: string;
  kode: string;
  nama: string;
  jenis: "part" | "jasa";
  stok: number;
  harga_jual: number;
}

interface KomponenTagihanProps {
  woId: string;
  nomorWo: string;
  statusWo: string;
  diskonWo: number;
  alasanDiskonWo: string | null;
  kepalaMekanikId: string;
  platKendaraan: string;
  merekModel: string;
  namaPelanggan: string;
  profil: {
    id: string;
    nama: string;
    peran: "owner" | "admin" | "kepala_mekanik";
  };
  items: ItemTagihan[];
  invoice: InvoiceData | null;
  payments: PaymentData[];
  inventoryItems: InventoryOption[];
}

const ALASAN_PENYESUAIAN_OPTIONS = [
  "Harga khusus pelanggan",
  "Negosiasi",
  "Harga paket",
  "Koreksi harga master",
  "Lainnya",
];

export function KomponenTagihan({
  woId,
  nomorWo,
  statusWo,
  diskonWo,
  alasanDiskonWo,
  kepalaMekanikId,
  platKendaraan,
  merekModel,
  namaPelanggan,
  profil,
  items,
  invoice,
  payments,
  inventoryItems,
}: KomponenTagihanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // Status Modals
  const [modalTambah, setModalTambah] = useState<"part" | "jasa" | null>(null);
  const [itemTerpilihId, setItemTerpilihId] = useState("");
  const [jumlahTambah, setJumlahTambah] = useState("1");

  const [itemHapus, setItemHapus] = useState<ItemTagihan | null>(null);

  const [itemSesuaikan, setItemSesuaikan] = useState<ItemTagihan | null>(null);
  const [hargaBaru, setHargaBaru] = useState("");
  const [pilihanAlasan, setPilihanAlasan] = useState("");
  const [alasanManual, setAlasanManual] = useState("");

  const [modalDiskon, setModalDiskon] = useState(false);
  const [inputDiskon, setInputDiskon] = useState(String(diskonWo));
  const [inputAlasanDiskon, setInputAlasanDiskon] = useState(alasanDiskonWo || "");

  const [modalTerbitkan, setModalTerbitkan] = useState(false);

  const [modalBayar, setModalBayar] = useState(false);
  const [metodeBayar, setMetodeBayar] = useState<"tunai" | "transfer" | "qris">("tunai");
  const [jumlahBayar, setJumlahBayar] = useState("");

  // Role & Permission Calculation
  const isOwner = profil.peran === "owner";
  const isAdmin = profil.peran === "admin";
  const isKmTim = profil.peran === "kepala_mekanik" && kepalaMekanikId === profil.id;

  const bolehKelolaItem = (isKmTim || isOwner) && statusWo === "dikerjakan" && !invoice;
  const bolehKelolaHarga = (isAdmin || isOwner) && !invoice;
  const bolehTerbitkanInvoice = (isAdmin || isOwner) && !invoice && statusWo === "siap_diambil";
  const bolehCatatPembayaran = (isAdmin || isOwner) && Boolean(invoice) && invoice?.status_bayar !== "lunas";

  // Calculations
  const subtotalTagihan = items.reduce(
    (acc, it) => acc + it.jumlah * it.harga_dipakai,
    0
  );
  const nilaiDiskon = invoice ? invoice.diskon : diskonWo;
  const totalTagihan = invoice ? invoice.total : Math.max(0, subtotalTagihan - nilaiDiskon);
  const totalTerbayar = invoice
    ? invoice.terbayar
    : payments.reduce((acc, p) => acc + p.jumlah, 0);
  const sisaTagihan = Math.max(0, totalTagihan - totalTerbayar);

  // Khusus Owner: Modal dan Laba
  const totalModal = items.reduce(
    (acc, it) => acc + it.jumlah * (it.harga_modal || 0),
    0
  );
  const labaKotor = totalTagihan - totalModal;
  const marginPersen = totalTagihan > 0 ? (labaKotor / totalTagihan) * 100 : 0;

  // 1. Tambah Item (Part / Jasa)
  const handleBukaTambah = (jenis: "part" | "jasa") => {
    setModalTambah(jenis);
    setItemTerpilihId("");
    setJumlahTambah("1");
  };

  const handleSimpanTambah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTerpilihId) {
      toast.error("Silakan pilih item terlebih dahulu");
      return;
    }
    const jumlahNum = parseInt(jumlahTambah, 10);
    if (isNaN(jumlahNum) || jumlahNum < 1) {
      toast.error("Jumlah item minimal 1");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.rpc("tambah_item_tagihan", {
        p_wo: woId,
        p_item: itemTerpilihId,
        p_jumlah: jumlahNum,
      });

      if (error) {
        toast.error("Gagal menambahkan item: " + error.message);
      } else {
        toast.success("Item berhasil ditambahkan ke tagihan");
        setModalTambah(null);
        router.refresh();
      }
    });
  };

  // 2. Hapus Item
  const handleKonfirmasiHapus = async () => {
    if (!itemHapus) return;

    startTransition(async () => {
      const { error } = await supabase.rpc("hapus_item_tagihan", {
        p_billing_item: itemHapus.id,
      });

      if (error) {
        toast.error("Gagal menghapus item: " + error.message);
      } else {
        toast.success("Item berhasil dihapus dari tagihan");
        setItemHapus(null);
        router.refresh();
      }
    });
  };

  // 3. Sesuaikan Harga (Admin/Owner)
  const handleBukaSesuaikan = (item: ItemTagihan) => {
    setItemSesuaikan(item);
    setHargaBaru(String(item.harga_dipakai));
    setPilihanAlasan("");
    setAlasanManual("");
  };

  const handleSimpanSesuaikan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSesuaikan) return;

    const hargaNum = parseInt(hargaBaru, 10);
    if (isNaN(hargaNum) || hargaNum < 0) {
      toast.error("Harga harus berupa angka minimal 0");
      return;
    }

    const alasanFinal =
      pilihanAlasan === "Lainnya" ? alasanManual.trim() : pilihanAlasan;

    if (!alasanFinal) {
      toast.error("Alasan penyesuaian harga wajib diisi");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.rpc("sesuaikan_harga_item", {
        p_billing_item: itemSesuaikan.id,
        p_harga: hargaNum,
        p_alasan: alasanFinal,
      });

      if (error) {
        toast.error("Gagal menyesuaikan harga: " + error.message);
      } else {
        toast.success("Harga item berhasil disesuaikan");
        setItemSesuaikan(null);
        router.refresh();
      }
    });
  };

  // 4. Atur Diskon
  const handleSimpanDiskon = async (e: React.FormEvent) => {
    e.preventDefault();
    const diskonNominal = parseInt(inputDiskon, 10);
    if (isNaN(diskonNominal) || diskonNominal < 0) {
      toast.error("Nominal diskon harus berupa angka >= 0");
      return;
    }
    if (diskonNominal > subtotalTagihan) {
      toast.error("Diskon tidak boleh melebihi subtotal (" + rupiah(subtotalTagihan) + ")");
      return;
    }
    if (diskonNominal > 0 && !inputAlasanDiskon.trim()) {
      toast.error("Alasan diskon wajib diisi bila nominal diskon lebih dari 0");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.rpc("atur_diskon", {
        p_wo: woId,
        p_diskon: diskonNominal,
        p_alasan: inputAlasanDiskon.trim(),
      });

      if (error) {
        toast.error("Gagal mengatur diskon: " + error.message);
      } else {
        toast.success("Diskon berhasil diperbarui");
        setModalDiskon(false);
        router.refresh();
      }
    });
  };

  // 5. Terbitkan Invoice
  const handleTerbitkanInvoice = async () => {
    startTransition(async () => {
      const { error } = await supabase.rpc("terbitkan_invoice", {
        p_wo: woId,
      });

      if (error) {
        toast.error("Gagal menerbitkan invoice: " + error.message);
      } else {
        toast.success("Invoice resmi berhasil diterbitkan!");
        setModalTerbitkan(false);
        router.refresh();
      }
    });
  };

  // 6. Catat Pembayaran
  const handleBukaBayar = () => {
    if (!invoice) return;
    setModalBayar(true);
    setMetodeBayar("tunai");
    setJumlahBayar(String(sisaTagihan));
  };

  const handleSimpanBayar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const nominal = parseInt(jumlahBayar, 10);
    if (isNaN(nominal) || nominal <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0");
      return;
    }
    if (nominal > sisaTagihan) {
      toast.error("Jumlah pembayaran melebihi sisa tagihan (" + rupiah(sisaTagihan) + ")");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.rpc("catat_pembayaran", {
        p_invoice: invoice.id,
        p_metode: metodeBayar,
        p_jumlah: nominal,
      });

      if (error) {
        toast.error("Gagal mencatat pembayaran: " + error.message);
      } else {
        toast.success("Pembayaran berhasil dicatat!");
        setModalBayar(false);
        router.refresh();
      }
    });
  };

  const itemPilihanOptions = inventoryItems.filter(
    (it) => it.jenis === modalTambah
  );

  return (
    <div className="space-y-6">
      {/* Kartu Header Rangkuman WO */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold font-mono text-white">{nomorWo}</span>
            <Badge variant="outline" className="text-xs font-mono font-semibold px-2.5 py-0.5 border-zinc-800 bg-zinc-900/80 text-zinc-200">
              {platKendaraan} · {merekModel}
            </Badge>
            {invoice ? (
              <Badge
                variant="outline"
                className={
                  invoice.status_bayar === "lunas"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono text-xs"
                    : invoice.status_bayar === "sebagian"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400 font-mono text-xs"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-400 font-mono text-xs"
                }
              >
                {invoice.status_bayar === "lunas"
                  ? "Invoice Lunas"
                  : invoice.status_bayar === "sebagian"
                  ? "Dibayar Sebagian"
                  : "Belum Bayar"}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-400 font-mono text-xs">
                Tagihan Terbuka (Belum Invoice)
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Pelanggan: <span className="font-semibold text-white">{namaPelanggan}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Lihat Invoice jika sudah terbit */}
          {invoice && (
            <Button
              asChild
              variant="outline"
              className="gap-2 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white font-mono text-xs"
            >
              <Link href={`/work-orders/${woId}/invoice`}>
                <FileText className="size-3.5 text-[#FF2E75]" />
                Lihat / Cetak Invoice
              </Link>
            </Button>
          )}

          {/* Tombol Terbitkan Invoice jika status siap_diambil & belum ada invoice */}
          {bolehTerbitkanInvoice && (
            <Button
              onClick={() => setModalTerbitkan(true)}
              className="bg-primary hover:bg-primary-strong text-white font-mono text-xs shadow-md shadow-pink-950/30 gap-1.5"
              disabled={items.length === 0}
            >
              <FileText className="size-3.5" />
              Terbitkan Invoice
            </Button>
          )}

          {/* Tombol Catat Pembayaran jika invoice sudah terbit dan belum lunas */}
          {bolehCatatPembayaran && (
            <Button
              onClick={handleBukaBayar}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs shadow-md shadow-emerald-950/30 gap-1.5"
            >
              <CreditCard className="size-3.5" />
              + Pembayaran
            </Button>
          )}

          {/* Tombol Tambah Item jika status dikerjakan */}
          {bolehKelolaItem && (
            <>
              <Button
                onClick={() => handleBukaTambah("part")}
                variant="outline"
                className="gap-1.5 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white font-mono text-xs"
              >
                <Plus className="size-3.5 text-[#FF2E75]" />
                Spare Part
              </Button>
              <Button
                onClick={() => handleBukaTambah("jasa")}
                variant="outline"
                className="gap-1.5 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white font-mono text-xs"
              >
                <Plus className="size-3.5 text-[#FF2E75]" />
                Jasa
              </Button>
            </>
          )}

          {/* Tombol Atur Diskon jika belum ada invoice */}
          {bolehKelolaHarga && (
            <Button
              onClick={() => setModalDiskon(true)}
              variant="outline"
              className="gap-1.5 border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white font-mono text-xs"
            >
              <Percent className="size-3.5 text-[#FF2E75]" />
              Diskon
            </Button>
          )}
        </div>
      </div>

      {/* Tabel Baris Tagihan */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#111116] overflow-hidden shadow-sm">
        <div className="p-5 pb-3 border-b border-zinc-800/80">
          <h3 className="text-base font-semibold text-white">Rincian Item Tagihan</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {invoice
              ? "Tagihan telah dikunci karena invoice resmi sudah diterbitkan."
              : statusWo === "dikerjakan"
              ? "Spare part dan jasa servis dapat ditambahkan atau disesuaikan oleh tim mekanik."
              : "Item hanya dapat ditambah atau dihapus saat WO berstatus dikerjakan."}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-900/90 border-b border-zinc-800 hover:bg-zinc-900/90">
              <TableHead className="w-12 text-center text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">No</TableHead>
              <TableHead className="text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Item</TableHead>
              <TableHead className="w-24 text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Jenis</TableHead>
              <TableHead className="text-center w-20 text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Qty</TableHead>
              <TableHead className="text-right text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Harga Master</TableHead>
              <TableHead className="text-right text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Harga Dipakai</TableHead>
              <TableHead className="text-right text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Subtotal</TableHead>
              {isOwner && (
                <>
                  <TableHead className="text-right text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">Modal</TableHead>
                  <TableHead className="text-right text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">Laba</TableHead>
                </>
              )}
              <TableHead className="w-24 text-center text-zinc-400 text-[11px] font-mono font-semibold uppercase tracking-wider">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={isOwner ? 10 : 8}
                  className="py-12 text-center text-zinc-500 font-mono"
                >
                  Belum ada item pekerjaan atau spare part yang dicatat.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it, idx) => {
                const subtotalItem = it.jumlah * it.harga_dipakai;
                const isDisesuaikan = it.harga_dipakai !== it.harga_master;
                const labaItem = isOwner
                  ? subtotalItem - it.jumlah * (it.harga_modal || 0)
                  : 0;

                return (
                  <TableRow key={it.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <TableCell className="text-center font-mono text-zinc-500">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      <div>{it.nama_item}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          it.jenis === "part"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-400 font-mono text-[10px]"
                            : "border-sky-500/20 bg-sky-500/10 text-sky-400 font-mono text-[10px]"
                        }
                      >
                        {it.jenis === "part" ? "Spare Part" : "Jasa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-white">
                      {it.jumlah}
                    </TableCell>
                    <TableCell className="text-right font-mono text-zinc-400">
                      {rupiah(it.harga_master)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        {isDisesuaikan && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-amber-400 hover:text-amber-300 transition-colors p-0.5"
                                aria-label="Lihat detail penyesuaian harga"
                              >
                                <Info className="size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs p-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200">
                              <p className="font-semibold text-white">Penyesuaian Harga:</p>
                              <p className="text-zinc-300 mt-0.5">
                                {it.alasan_penyesuaian || "Tidak ada keterangan"}
                              </p>
                              <p className="text-zinc-500 text-[10px] mt-1 font-mono">
                                Oleh: {it.nama_pengubah || "Admin/Owner"} ·{" "}
                                {it.disesuaikan_at ? tanggal(it.disesuaikan_at) : ""}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span className={isDisesuaikan ? "text-[#FF2E75] font-semibold" : "text-zinc-200"}>
                          {rupiah(it.harga_dipakai)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-white">
                      {rupiah(subtotalItem)}
                    </TableCell>
                    {isOwner && (
                      <>
                        <TableCell className="text-right font-mono text-xs text-zinc-400">
                          {rupiah(it.harga_modal || 0)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-xs font-semibold ${
                            labaItem < 0 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {rupiah(labaItem)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {bolehKelolaHarga && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBukaSesuaikan(it)}
                                className="size-7 p-0 text-zinc-400 hover:text-[#FF2E75] hover:bg-zinc-800"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200">
                              Sesuaikan Harga
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {bolehKelolaItem && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setItemHapus(it)}
                                className="size-7 p-0 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200">
                              Hapus Item
                            </TooltipContent>
                          </Tooltip>
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

      {/* Rangkuman Biaya & Riwayat Pembayaran */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Riwayat Pembayaran */}
        <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-zinc-800/80 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <CreditCard className="size-4 text-[#FF2E75]" />
              Riwayat Pembayaran
            </h3>
            {bolehCatatPembayaran && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBukaBayar}
                className="h-8 gap-1.5 text-xs font-mono border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white"
              >
                <Plus className="size-3.5 text-[#FF2E75]" />
                Bayar
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {!invoice ? (
              <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                Invoice belum diterbitkan. Pembayaran dapat dicatat setelah invoice resmi terbit.
              </p>
            ) : payments.length === 0 ? (
              <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                Belum ada transaksi pembayaran untuk invoice ini.
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase font-mono text-[10px] font-bold border-zinc-800 bg-zinc-900 text-zinc-300">
                          {p.metode}
                        </Badge>
                        <span className="text-xs font-mono text-zinc-400">
                          {tanggal(p.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                        Oleh: {p.nama_pencatat || "Kasir Bengkel"}
                      </p>
                    </div>
                    <span className="font-semibold font-mono text-sm text-emerald-400">
                      + {rupiah(p.jumlah)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ringkasan Total Tagihan */}
        <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-5 shadow-sm space-y-3.5">
          <div className="pb-3 border-b border-zinc-800/80">
            <h3 className="text-base font-semibold text-white">Ringkasan Tagihan</h3>
          </div>
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400 uppercase">Subtotal</span>
              <span className="font-medium text-white">{rupiah(subtotalTagihan)}</span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="text-zinc-400 uppercase">Diskon</span>
                {alasanDiskonWo && (
                  <p className="text-[11px] text-zinc-500 italic mt-0.5">
                    Alasan: {alasanDiskonWo}
                  </p>
                )}
              </div>
              <span className="font-medium text-rose-400">
                - {rupiah(nilaiDiskon)}
              </span>
            </div>

            <div className="border-t border-zinc-800 pt-3 flex justify-between items-center text-sm font-bold text-white">
              <span className="uppercase">Total Tagihan</span>
              <span className="text-[#FF2E75] text-lg font-mono">
                {rupiah(totalTagihan)}
              </span>
            </div>

            {invoice && (
              <>
                <div className="flex justify-between pt-1">
                  <span className="text-zinc-400 uppercase">Sudah Dibayar</span>
                  <span className="font-semibold text-emerald-400">
                    {rupiah(totalTerbayar)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-dashed border-zinc-800 text-sm font-semibold">
                  <span className="text-white uppercase">Sisa Pembayaran</span>
                  <span
                    className={sisaTagihan === 0 ? "text-emerald-400" : "text-amber-400"}
                  >
                    {rupiah(sisaTagihan)}
                  </span>
                </div>
              </>
            )}

            {/* Bagian Khusus Owner: Modal & Laba Kotor */}
            {isOwner && (
              <div className="mt-4 border-t border-zinc-800 pt-3.5 bg-zinc-900/60 -mx-5 -mb-5 p-4 rounded-b-xl space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Analisis Keuntungan (Khusus Owner)
                </p>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Total Modal Spare Part</span>
                  <span className="text-white">{rupiah(totalModal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1">
                  <span className="text-white">Laba Kotor WO</span>
                  <span
                    className={labaKotor < 0 ? "text-rose-400" : "text-emerald-400"}
                  >
                    {rupiah(labaKotor)} ({marginPersen.toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIALOG-DIALOG FITUR B */}
      {/* ========================================================================= */}

      {/* 1. Modal Tambah Spare Part / Jasa */}
      <Dialog open={modalTambah !== null} onOpenChange={() => setModalTambah(null)}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold font-mono text-base">
              Tambah {modalTambah === "part" ? "Spare Part" : "Jasa"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Pilih {modalTambah === "part" ? "spare part" : "layanan jasa"} yang digunakan
              dalam pengerjaan WO ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSimpanTambah} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-select" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                Item *
              </Label>
              <Select value={itemTerpilihId} onValueChange={setItemTerpilihId}>
                <SelectTrigger id="item-select" className="w-full bg-zinc-900/80 border-zinc-800 text-zinc-200">
                  <SelectValue placeholder={`Pilih ${modalTambah === "part" ? "spare part" : "jasa"}...`} />
                </SelectTrigger>
                <SelectContent className="max-h-64 bg-zinc-900 border-zinc-800 text-zinc-200">
                  {itemPilihanOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="hover:bg-zinc-800 focus:bg-zinc-800">
                      {opt.nama} · {rupiah(opt.harga_jual)}{" "}
                      {modalTambah === "part" && `(Stok: ${opt.stok})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumlah-item" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                Jumlah *
              </Label>
              <Input
                id="jumlah-item"
                type="number"
                min="1"
                value={jumlahTambah}
                onChange={(e) => setJumlahTambah(e.target.value)}
                required
                className="bg-zinc-900/80 border-zinc-800 text-white font-mono focus-visible:border-[#FF2E75]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalTambah(null)}
                disabled={isPending}
                className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending || !itemTerpilihId}
                className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30"
              >
                {isPending ? "Menyimpan..." : "Tambah ke Tagihan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Modal Konfirmasi Hapus Item */}
      <Dialog open={itemHapus !== null} onOpenChange={() => setItemHapus(null)}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-400 font-semibold font-mono text-base">
              Hapus Item Tagihan
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-semibold text-white">{itemHapus?.nama_item}</span> dari tagihan?
              {itemHapus?.jenis === "part" && (
                <span className="block mt-1 text-[#FF2E75]">
                  Stok spare part sebanyak {itemHapus.jumlah} akan dikembalikan otomatis ke inventaris.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setItemHapus(null)}
              disabled={isPending}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleKonfirmasiHapus}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/30"
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Modal Sesuaikan Harga Item */}
      <Dialog open={itemSesuaikan !== null} onOpenChange={() => setItemSesuaikan(null)}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold font-mono text-base">
              Sesuaikan Harga Item
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Ubah harga yang ditagihkan untuk{" "}
              <span className="font-semibold text-white">{itemSesuaikan?.nama_item}</span>.
              Harga master di inventaris tidak akan berubah.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSimpanSesuaikan} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-400 font-mono uppercase tracking-wider">
                Harga Master Saat Ini
              </Label>
              <div className="text-sm font-mono font-semibold text-zinc-300">
                {rupiah(itemSesuaikan?.harga_master || 0)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="harga-baru" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                Harga Dipakai (Rp) *
              </Label>
              <Input
                id="harga-baru"
                type="number"
                min="0"
                value={hargaBaru}
                onChange={(e) => setHargaBaru(e.target.value)}
                required
                className="bg-zinc-900/80 border-zinc-800 text-white font-mono focus-visible:border-[#FF2E75]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pilihan-alasan" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                Alasan Penyesuaian Harga *
              </Label>
              <Select value={pilihanAlasan} onValueChange={setPilihanAlasan}>
                <SelectTrigger id="pilihan-alasan" className="w-full bg-zinc-900/80 border-zinc-800 text-zinc-200">
                  <SelectValue placeholder="Pilih alasan..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  {ALASAN_PENYESUAIAN_OPTIONS.map((al) => (
                    <SelectItem key={al} value={al} className="hover:bg-zinc-800 focus:bg-zinc-800">
                      {al}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pilihanAlasan === "Lainnya" && (
              <div className="space-y-2">
                <Label htmlFor="alasan-manual" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                  Tuliskan Alasan *
                </Label>
                <Textarea
                  id="alasan-manual"
                  placeholder="Contoh: Kesepakatan paket servis berkala..."
                  value={alasanManual}
                  onChange={(e) => setAlasanManual(e.target.value)}
                  required
                  className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-[#FF2E75]"
                />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemSesuaikan(null)}
                disabled={isPending}
                className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30"
              >
                {isPending ? "Menyimpan..." : "Simpan Harga"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Modal Atur Diskon */}
      <Dialog open={modalDiskon} onOpenChange={setModalDiskon}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold font-mono text-base">
              Atur Diskon Total
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Berikan potongan harga total sebelum invoice resmi diterbitkan. Diskon tidak boleh
              melebihi subtotal ({rupiah(subtotalTagihan)}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSimpanDiskon} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="input-diskon" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                Nominal Diskon (Rp) *
              </Label>
              <Input
                id="input-diskon"
                type="number"
                min="0"
                max={subtotalTagihan}
                value={inputDiskon}
                onChange={(e) => setInputDiskon(e.target.value)}
                required
                className="bg-zinc-900/80 border-zinc-800 text-white font-mono focus-visible:border-[#FF2E75]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="input-alasan-diskon" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                Alasan Diskon
              </Label>
              <Textarea
                id="input-alasan-diskon"
                placeholder="Contoh: Promo kemerdekaan / voucher pelanggan setia..."
                value={inputAlasanDiskon}
                onChange={(e) => setInputAlasanDiskon(e.target.value)}
                required={parseInt(inputDiskon, 10) > 0}
                className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-[#FF2E75]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalDiskon(false)}
                disabled={isPending}
                className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30"
              >
                {isPending ? "Menyimpan..." : "Simpan Diskon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal Konfirmasi Terbitkan Invoice */}
      <Dialog open={modalTerbitkan} onOpenChange={setModalTerbitkan}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold font-mono text-base">
              Terbitkan Invoice Resmi
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Apakah Anda yakin ingin menerbitkan invoice untuk WO{" "}
              <span className="font-semibold text-white">{nomorWo}</span> dengan total tagihan{" "}
              <span className="font-semibold text-[#FF2E75] font-mono">{rupiah(totalTagihan)}</span>?
              <span className="block mt-2 text-zinc-400">
                Setelah invoice diterbitkan, rincian item tagihan dan diskon akan dikunci dan tidak
                dapat diubah kembali.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalTerbitkan(false)}
              disabled={isPending}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleTerbitkanInvoice}
              className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30"
              disabled={isPending}
            >
              {isPending ? "Menerbitkan..." : "Ya, Terbitkan Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Modal Catat Pembayaran */}
      <Dialog open={modalBayar} onOpenChange={setModalBayar}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold font-mono text-base">
              Catat Pembayaran
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Catat penerimaan pembayaran dari pelanggan untuk Invoice{" "}
              <span className="font-semibold text-white">{invoice?.nomor}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSimpanBayar} className="space-y-4">
            <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400 uppercase">Sisa Tagihan:</span>
              <span className="font-bold text-amber-400 text-sm">
                {rupiah(sisaTagihan)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metode-pembayaran" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                Metode Pembayaran *
              </Label>
              <Select
                value={metodeBayar}
                onValueChange={(val) => setMetodeBayar(val as "tunai" | "transfer" | "qris")}
              >
                <SelectTrigger id="metode-pembayaran" className="w-full bg-zinc-900/80 border-zinc-800 text-zinc-200">
                  <SelectValue placeholder="Pilih metode..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="tunai" className="hover:bg-zinc-800 focus:bg-zinc-800">Tunai (Cash)</SelectItem>
                  <SelectItem value="transfer" className="hover:bg-zinc-800 focus:bg-zinc-800">Transfer Bank</SelectItem>
                  <SelectItem value="qris" className="hover:bg-zinc-800 focus:bg-zinc-800">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="jumlah-bayar" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                  Jumlah Pembayaran (Rp) *
                </Label>
                <button
                  type="button"
                  onClick={() => setJumlahBayar(String(sisaTagihan))}
                  className="text-xs text-[#FF2E75] hover:underline font-mono font-medium"
                >
                  Bayar Lunas
                </button>
              </div>
              <Input
                id="jumlah-bayar"
                type="number"
                min="1"
                max={sisaTagihan}
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                required
                className="bg-zinc-900/80 border-zinc-800 text-white font-mono focus-visible:border-[#FF2E75]"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalBayar(false)}
                disabled={isPending}
                className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950/30"
                disabled={isPending}
              >
                {isPending ? "Memproses..." : "Simpan Pembayaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
