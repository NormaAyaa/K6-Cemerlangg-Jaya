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
  ReceiptText,
  Wallet,
  AlertCircle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
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
  const [inputDiskon, setInputDiskon] = useState(String(diskonWo || 0));
  const [inputAlasanDiskon, setInputAlasanDiskon] = useState(alasanDiskonWo || "");

  const [modalTerbitkan, setModalTerbitkan] = useState(false);

  const [modalBayar, setModalBayar] = useState(false);
  const [metodeBayar, setMetodeBayar] = useState<"tunai" | "transfer" | "qris">("tunai");
  const [jumlahBayar, setJumlahBayar] = useState("");

  // Role Checks
  const isOwner = profil.peran === "owner";
  const isAdmin = profil.peran === "admin";
  const isTimWo = profil.peran === "kepala_mekanik" && kepalaMekanikId === profil.id;

  const bolehKelolaItem = (isOwner || isTimWo) && statusWo === "dikerjakan" && !invoice;
  const bolehKelolaHarga = (isOwner || isAdmin) && !invoice;
  const bolehTerbitkanInvoice = (isOwner || isAdmin) && statusWo === "siap_diambil" && !invoice;
  const bolehCatatPembayaran = (isOwner || isAdmin) && !!invoice && invoice.status_bayar !== "lunas";

  // Calculations
  const subtotalTagihan = items.reduce((acc, it) => acc + it.jumlah * it.harga_dipakai, 0);
  const nilaiDiskon = invoice ? invoice.diskon : diskonWo;
  const totalTagihan = invoice ? invoice.total : Math.max(0, subtotalTagihan - nilaiDiskon);
  const totalTerbayar = invoice ? invoice.terbayar : 0;
  const sisaTagihan = invoice ? Math.max(0, invoice.total - invoice.terbayar) : totalTagihan;
  const persenTerbayar =
    totalTagihan > 0 ? Math.min(100, Math.round((totalTerbayar / totalTagihan) * 100)) : 0;

  // Owner Cost and Profit
  const totalModal = items.reduce((acc, it) => acc + it.jumlah * (it.harga_modal || 0), 0);
  const labaKotor = totalTagihan - totalModal;
  const marginPersen = totalTagihan > 0 ? (labaKotor / totalTagihan) * 100 : 0;

  // 1. Tambah Item
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
    const qty = parseInt(jumlahTambah, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error("Jumlah harus minimal 1");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.rpc("tambah_item_tagihan", {
        p_wo: woId,
        p_item: itemTerpilihId,
        p_jumlah: qty,
      });

      if (error) {
        toast.error("Gagal menambah item: " + error.message);
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
        toast.success("Item berhasil dihapus dan stok diperbarui");
        setItemHapus(null);
        router.refresh();
      }
    });
  };

  // 3. Sesuaikan Harga
  const handleBukaSesuaikan = (item: ItemTagihan) => {
    setItemSesuaikan(item);
    setHargaBaru(String(item.harga_dipakai));
    if (item.alasan_penyesuaian) {
      if (ALASAN_PENYESUAIAN_OPTIONS.slice(0, 4).includes(item.alasan_penyesuaian)) {
        setPilihanAlasan(item.alasan_penyesuaian);
        setAlasanManual("");
      } else {
        setPilihanAlasan("Lainnya");
        setAlasanManual(item.alasan_penyesuaian);
      }
    } else {
      setPilihanAlasan("");
      setAlasanManual("");
    }
  };

  const handleSimpanSesuaikan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSesuaikan) return;

    const hargaNominal = parseInt(hargaBaru, 10);
    if (isNaN(hargaNominal) || hargaNominal < 0) {
      toast.error("Harga tidak valid (harus $\\ge$ 0)");
      return;
    }

    const alasanFinal = pilihanAlasan === "Lainnya" ? alasanManual.trim() : pilihanAlasan;
    if (hargaNominal !== itemSesuaikan.harga_master && !alasanFinal) {
      toast.error("Alasan penyesuaian wajib diisi jika harga berbeda dari master");
      return;
    }

    startTransition(async () => {
      const { data: diBawahModal, error } = await supabase.rpc("sesuaikan_harga_item", {
        p_billing_item: itemSesuaikan.id,
        p_harga: hargaNominal,
        p_alasan: alasanFinal,
      });

      if (error) {
        toast.error("Gagal menyesuaikan harga: " + error.message);
      } else {
        if (diBawahModal) {
          toast.warning("Harga disimpan, namun perhatian: harga ini di bawah modal!");
        } else {
          toast.success("Harga item berhasil disesuaikan");
        }
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
      toast.error("Nominal diskon harus berupa angka $\\ge$ 0");
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
      {/* Header halaman & aksi utama */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-text">Tagihan &amp; Invoice</h1>
          <p className="text-sm text-text-muted">
            {nomorWo} · {platKendaraan} · {merekModel} · {namaPelanggan}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice ? (
            <Badge
              className={cn(
                "px-2.5 py-1 text-xs font-semibold",
                invoice.status_bayar === "lunas" &&
                  "border border-success/30 bg-success/10 text-success",
                invoice.status_bayar === "sebagian" &&
                  "border border-warning/30 bg-warning/10 text-warning",
                invoice.status_bayar === "belum_bayar" &&
                  "border border-border bg-muted text-text-muted",
              )}
            >
              {invoice.status_bayar === "lunas"
                ? "Invoice Lunas"
                : invoice.status_bayar === "sebagian"
                ? "Dibayar Sebagian"
                : "Belum Bayar"}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-border px-2.5 py-1 text-xs text-text-muted">
              Tagihan Terbuka
            </Badge>
          )}

          {/* Tombol Lihat Invoice jika sudah terbit */}
          {invoice && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2 border-primary/50 text-primary hover:bg-primary-soft hover:text-primary"
            >
              <Link href={`/work-orders/${woId}/invoice`}>
                <FileText className="size-4" />
                Lihat / Cetak Invoice
              </Link>
            </Button>
          )}

          {/* Tombol Catat Pembayaran jika invoice sudah terbit dan belum lunas */}
          {bolehCatatPembayaran && (
            <Button
              size="sm"
              onClick={handleBukaBayar}
              className="gap-2 bg-success text-[#04140A] hover:bg-success/90"
            >
              <CreditCard className="size-4" />
              + Pembayaran
            </Button>
          )}

          {/* Tombol Terbitkan Invoice jika status siap_diambil & belum ada invoice */}
          {bolehTerbitkanInvoice && (
            <Button
              onClick={() => setModalTerbitkan(true)}
              size="sm"
              className="gap-2 bg-primary text-white hover:bg-primary-strong"
              disabled={items.length === 0}
            >
              <FileText className="size-4" />
              Terbitkan Invoice
            </Button>
          )}

          {/* Tombol Tambah Item jika status dikerjakan */}
          {bolehKelolaItem && (
            <>
              <Button onClick={() => handleBukaTambah("part")} variant="outline" size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Spare Part
              </Button>
              <Button onClick={() => handleBukaTambah("jasa")} variant="outline" size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Jasa
              </Button>
            </>
          )}

          {/* Tombol Atur Diskon jika belum ada invoice */}
          {bolehKelolaHarga && (
            <Button onClick={() => setModalDiskon(true)} variant="outline" size="sm" className="gap-1.5">
              <Percent className="size-4" />
              Diskon
            </Button>
          )}
        </div>
      </div>

      {/* Kartu KPI ringkasan tagihan */}
      <div
        className={cn(
          "grid grid-cols-2 gap-3 md:grid-cols-3",
          isOwner ? "xl:grid-cols-6" : "xl:grid-cols-5",
        )}
      >
        <KartuKpi
          label="Subtotal"
          nilai={rupiah(subtotalTagihan)}
          keterangan={`${items.length} baris tagihan`}
          ikon={ReceiptText}
        />
        <KartuKpi
          label="Diskon"
          nilai={nilaiDiskon > 0 ? `- ${rupiah(nilaiDiskon)}` : rupiah(0)}
          keterangan={nilaiDiskon > 0 ? "Ada potongan" : "Tanpa potongan"}
          ikon={Percent}
        />
        <KartuKpi
          label="Total Tagihan"
          nilai={rupiah(totalTagihan)}
          keterangan={invoice ? invoice.nomor : "Belum diterbitkan"}
          ikon={Wallet}
          utama
        />
        <KartuKpi
          label="Sudah Dibayar"
          nilai={rupiah(totalTerbayar)}
          keterangan={`${persenTerbayar}% dari total`}
          ikon={CreditCard}
        />
        <KartuKpi
          label="Sisa Tagihan"
          nilai={rupiah(sisaTagihan)}
          keterangan={sisaTagihan === 0 ? "Lunas" : "Belum lunas"}
          ikon={AlertCircle}
        />
        {isOwner && (
          <KartuKpi
            label="Laba Kotor"
            nilai={rupiah(labaKotor)}
            keterangan={`Margin ${marginPersen.toFixed(1)}%`}
            ikon={TrendingUp}
          />
        )}
      </div>

      {/* Konten utama: rincian item + panel ringkasan */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Tabel Baris Tagihan */}
        <Card className="overflow-hidden border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-text">
                <ReceiptText className="size-4 text-primary" />
                Rincian Item Tagihan
              </CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                {invoice
                  ? "Tagihan telah dikunci karena invoice sudah diterbitkan."
                  : statusWo === "dikerjakan"
                  ? "Spare part dan jasa dapat ditambahkan atau dihapus oleh Kepala Mekanik."
                  : "Item hanya dapat ditambah/dihapus saat WO berstatus dikerjakan."}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 border-border text-xs text-text-muted">
              {items.length} item
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-24">Jenis</TableHead>
                  <TableHead className="text-right w-20">Jumlah</TableHead>
                  <TableHead className="text-right">Harga Master</TableHead>
                  <TableHead className="text-right">Harga Dipakai</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  {isOwner && (
                    <>
                      <TableHead className="text-right text-xs text-text-muted">Modal / Item</TableHead>
                      <TableHead className="text-right text-xs text-text-muted">Laba Baris</TableHead>
                    </>
                  )}
                  <TableHead className="w-24 text-center">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isOwner ? 10 : 8}
                    className="py-12 text-center text-text-muted"
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
                    <TableRow key={it.id} className="hover:bg-muted/20">
                      <TableCell className="text-center font-medium text-text-muted">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium text-text">
                        <div>{it.nama_item}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={it.jenis === "part" ? "secondary" : "outline"}
                          className="capitalize text-xs font-normal"
                        >
                          {it.jenis}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {it.jumlah}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-text-muted">
                        {rupiah(it.harga_master)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDisesuaikan && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="p-0.5 text-warning transition-colors hover:text-warning/80"
                                  aria-label="Lihat detail penyesuaian harga"
                                >
                                  <Info className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="tema-tagihan max-w-xs p-2.5 text-xs">
                                <p className="font-semibold text-text">Penyesuaian Harga:</p>
                                <p className="text-text-body mt-0.5">
                                  {it.alasan_penyesuaian || "Tidak ada keterangan"}
                                </p>
                                <p className="text-text-muted text-[10px] mt-1">
                                  Oleh: {it.nama_pengubah || "Admin/Owner"} ·{" "}
                                  {it.disesuaikan_at ? tanggal(it.disesuaikan_at) : ""}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span className={isDisesuaikan ? "text-primary font-semibold" : ""}>
                            {rupiah(it.harga_dipakai)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-text">
                        {rupiah(subtotalItem)}
                      </TableCell>
                      {isOwner && (
                        <>
                          <TableCell className="text-right tabular-nums text-xs text-text-muted">
                            {rupiah(it.harga_modal || 0)}
                          </TableCell>
                          <TableCell
                            className={`text-right tabular-nums text-xs font-medium ${
                              labaItem < 0 ? "text-danger" : "text-success"
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
                                  size="icon-sm"
                                  onClick={() => handleBukaSesuaikan(it)}
                                  className="h-7 w-7 text-text-muted hover:text-primary"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="tema-tagihan">Sesuaikan Harga</TooltipContent>
                            </Tooltip>
                          )}
                          {bolehKelolaItem && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setItemHapus(it)}
                                  className="h-7 w-7 text-text-muted hover:text-danger"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="tema-tagihan">Hapus Item</TooltipContent>
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
        </CardContent>
      </Card>

        {/* Panel kanan: ringkasan + status invoice */}
        <div className="space-y-6">
          {/* Ringkasan Total Tagihan */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-text">
                <Wallet className="size-4 text-primary" />
                Ringkasan Tagihan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-text-body">Subtotal</span>
                <span className="font-medium tabular-nums text-text">{rupiah(subtotalTagihan)}</span>
              </div>

              <div className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <span className="text-text-body">Diskon</span>
                  {alasanDiskonWo && (
                    <p className="text-xs italic text-text-muted">Alasan: {alasanDiskonWo}</p>
                  )}
                </div>
                <span className="font-medium tabular-nums text-danger">- {rupiah(nilaiDiskon)}</span>
              </div>

              <div className="flex justify-between border-t border-border pt-3 text-base font-bold text-text">
                <span>Total Tagihan</span>
                <span className="text-lg tabular-nums text-primary">{rupiah(totalTagihan)}</span>
              </div>

              {invoice && (
                <>
                  <div className="flex justify-between pt-1 text-sm text-text-body">
                    <span>Sudah Dibayar</span>
                    <span className="font-semibold tabular-nums text-success">{rupiah(totalTerbayar)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-border pt-1 text-sm font-semibold">
                    <span className="text-text">Sisa Pembayaran</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        sisaTagihan === 0 ? "text-success" : "text-warning",
                      )}
                    >
                      {rupiah(sisaTagihan)}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>Terbayar</span>
                      <span className="tabular-nums">{persenTerbayar}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${persenTerbayar}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Bagian Khusus Owner: Modal & Laba Kotor */}
              {isOwner && (
                <div className="mt-4 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Analisis Keuntungan (Hanya Owner)
                  </p>
                  <div className="flex justify-between text-xs text-text-body">
                    <span>Total Modal Spare Part</span>
                    <span className="tabular-nums">{rupiah(totalModal)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold">
                    <span className="text-text">Laba Kotor WO</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        labaKotor < 0 ? "text-danger" : "text-success",
                      )}
                    >
                      {rupiah(labaKotor)} ({marginPersen.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Invoice & Aksi */}
          <Card className="border-border shadow-xs">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-text">
                <FileText className="size-4 text-primary" />
                Status Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {invoice ? (
                <>
                  <div>
                    <p className="text-xs text-text-muted">Nomor Invoice</p>
                    <p className="font-mono text-sm font-semibold text-text">{invoice.nomor}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Diterbitkan</span>
                    <span className="tabular-nums text-text">{tanggal(invoice.diterbitkan_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Status</span>
                    <span
                      className={cn(
                        "font-semibold",
                        invoice.status_bayar === "lunas" && "text-success",
                        invoice.status_bayar === "sebagian" && "text-warning",
                        invoice.status_bayar === "belum_bayar" && "text-text-muted",
                      )}
                    >
                      {invoice.status_bayar === "lunas"
                        ? "Lunas"
                        : invoice.status_bayar === "sebagian"
                        ? "Dibayar Sebagian"
                        : "Belum Bayar"}
                    </span>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full gap-2 border-primary/50 text-primary hover:bg-primary-soft hover:text-primary"
                  >
                    <Link href={`/work-orders/${woId}/invoice`}>
                      <FileText className="size-4" />
                      Lihat / Cetak Invoice
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-text-muted">
                    Invoice belum diterbitkan. Tagihan masih bisa diubah sampai invoice resmi terbit.
                  </p>
                  {bolehTerbitkanInvoice ? (
                    <Button
                      onClick={() => setModalTerbitkan(true)}
                      className="w-full gap-2 bg-primary text-white hover:bg-primary-strong"
                      disabled={items.length === 0}
                    >
                      <FileText className="size-4" />
                      Terbitkan Invoice
                    </Button>
                  ) : (
                    <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-text-muted">
                      Invoice dapat diterbitkan saat WO berstatus{" "}
                      <span className="font-semibold text-text">Siap Diambil</span> oleh Admin atau
                      Owner.
                    </p>
                  )}
                </>
              )}

              {bolehCatatPembayaran && (
                <Button
                  onClick={handleBukaBayar}
                  className="w-full gap-2 bg-success text-[#04140A] hover:bg-success/90"
                >
                  <CreditCard className="size-4" />
                  Catat Pembayaran
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Riwayat Pembayaran */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-text">
              <CreditCard className="size-4 text-primary" />
              Riwayat Pembayaran
            </CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              Pembayaran yang tercatat untuk invoice ini.
            </p>
          </div>
          {bolehCatatPembayaran && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleBukaBayar}
              className="h-8 gap-1 border-primary/50 text-xs text-primary hover:bg-primary-soft hover:text-primary"
            >
              <Plus className="size-3.5" />
              Bayar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-5">
          {!invoice ? (
            <p className="py-6 text-center text-sm text-text-muted">
              Invoice belum diterbitkan. Pembayaran dapat dicatat setelah invoice resmi terbit.
            </p>
          ) : payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              Belum ada transaksi pembayaran untuk invoice ini.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-border text-[11px] font-semibold uppercase text-text-body"
                      >
                        {p.metode}
                      </Badge>
                      <span className="text-xs tabular-nums text-text-muted">
                        {tanggal(p.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Oleh: {p.nama_pencatat || "Kasir Bengkel"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-success">
                    + {rupiah(p.jumlah)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* DIALOG-DIALOG FITUR B */}
      {/* ========================================================================= */}

      {/* 1. Modal Tambah Spare Part / Jasa */}
      <Dialog open={modalTambah !== null} onOpenChange={() => setModalTambah(null)}>
        <DialogContent className="tema-tagihan sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Tambah {modalTambah === "part" ? "Spare Part" : "Jasa"}
            </DialogTitle>
            <DialogDescription>
              Pilih {modalTambah === "part" ? "spare part" : "layanan jasa"} yang digunakan
              dalam pengerjaan WO ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSimpanTambah} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-select">Item</Label>
              <Select value={itemTerpilihId} onValueChange={setItemTerpilihId}>
                <SelectTrigger id="item-select" className="w-full">
                  <SelectValue placeholder={`Pilih ${modalTambah === "part" ? "spare part" : "jasa"}...`} />
                </SelectTrigger>
                <SelectContent className="tema-tagihan max-h-64">
                  {itemPilihanOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.nama} · {rupiah(opt.harga_jual)}{" "}
                      {modalTambah === "part" && `(Stok: ${opt.stok})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumlah-item">Jumlah</Label>
              <Input
                id="jumlah-item"
                type="number"
                min="1"
                value={jumlahTambah}
                onChange={(e) => setJumlahTambah(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalTambah(null)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending || !itemTerpilihId}>
                {isPending ? "Menyimpan..." : "Tambah ke Tagihan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Modal Konfirmasi Hapus Item */}
      <Dialog open={itemHapus !== null} onOpenChange={() => setItemHapus(null)}>
        <DialogContent className="tema-tagihan sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Item Tagihan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-semibold text-text">{itemHapus?.nama_item}</span> dari tagihan?
              {itemHapus?.jenis === "part" && (
                <span className="block mt-1 text-primary">
                  Stok spare part sebanyak {itemHapus.jumlah} akan dikembalikan otomatis ke inventaris.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemHapus(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleKonfirmasiHapus}
              disabled={isPending}
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Modal Sesuaikan Harga Item */}
      <Dialog open={itemSesuaikan !== null} onOpenChange={() => setItemSesuaikan(null)}>
        <DialogContent className="tema-tagihan sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan Harga Item</DialogTitle>
            <DialogDescription>
              Ubah harga yang ditagihkan untuk{" "}
              <span className="font-semibold text-text">{itemSesuaikan?.nama_item}</span>.
              Harga master di inventaris tidak akan berubah.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSimpanSesuaikan} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Harga Master Saat Ini</Label>
              <div className="text-sm font-medium text-text-muted">
                {rupiah(itemSesuaikan?.harga_master || 0)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="harga-baru">Harga Dipakai (Rp)</Label>
              <Input
                id="harga-baru"
                type="number"
                min="0"
                value={hargaBaru}
                onChange={(e) => setHargaBaru(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pilihan-alasan">Alasan Penyesuaian Harga *</Label>
              <Select value={pilihanAlasan} onValueChange={setPilihanAlasan}>
                <SelectTrigger id="pilihan-alasan" className="w-full">
                  <SelectValue placeholder="Pilih alasan..." />
                </SelectTrigger>
                <SelectContent className="tema-tagihan">
                  {ALASAN_PENYESUAIAN_OPTIONS.map((al) => (
                    <SelectItem key={al} value={al}>
                      {al}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pilihanAlasan === "Lainnya" && (
              <div className="space-y-2">
                <Label htmlFor="alasan-manual">Tuliskan Alasan *</Label>
                <Textarea
                  id="alasan-manual"
                  placeholder="Contoh: Kesepakatan paket servis berkala..."
                  value={alasanManual}
                  onChange={(e) => setAlasanManual(e.target.value)}
                  required
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemSesuaikan(null)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Harga"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Modal Atur Diskon */}
      <Dialog open={modalDiskon} onOpenChange={setModalDiskon}>
        <DialogContent className="tema-tagihan sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Diskon Total</DialogTitle>
            <DialogDescription>
              Berikan potongan harga total sebelum invoice resmi diterbitkan. Diskon tidak boleh
              melebihi subtotal ({rupiah(subtotalTagihan)}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSimpanDiskon} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="input-diskon">Nominal Diskon (Rp)</Label>
              <Input
                id="input-diskon"
                type="number"
                min="0"
                max={subtotalTagihan}
                value={inputDiskon}
                onChange={(e) => setInputDiskon(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="input-alasan-diskon">Alasan Diskon</Label>
              <Textarea
                id="input-alasan-diskon"
                placeholder="Contoh: Promo kemerdekaan / voucher pelanggan setia..."
                value={inputAlasanDiskon}
                onChange={(e) => setInputAlasanDiskon(e.target.value)}
                required={parseInt(inputDiskon, 10) > 0}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalDiskon(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Diskon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal Konfirmasi Terbitkan Invoice */}
      <Dialog open={modalTerbitkan} onOpenChange={setModalTerbitkan}>
        <DialogContent className="tema-tagihan sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Terbitkan Invoice Resmi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menerbitkan invoice untuk WO{" "}
              <span className="font-semibold text-text">{nomorWo}</span> dengan total tagihan{" "}
              <span className="font-semibold text-primary">{rupiah(totalTagihan)}</span>?
              <span className="block mt-2 text-text-muted">
                Setelah invoice diterbitkan, rincian item tagihan dan diskon akan dikunci dan tidak
                dapat diubah kembali.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalTerbitkan(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleTerbitkanInvoice}
              className="bg-primary hover:bg-primary-strong text-white"
              disabled={isPending}
            >
              {isPending ? "Menerbitkan..." : "Ya, Terbitkan Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Modal Catat Pembayaran */}
      <Dialog open={modalBayar} onOpenChange={setModalBayar}>
        <DialogContent className="tema-tagihan sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran</DialogTitle>
            <DialogDescription>
              Catat penerimaan pembayaran dari pelanggan untuk Invoice{" "}
              <span className="font-semibold text-text">{invoice?.nomor}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSimpanBayar} className="space-y-4">
            <div className="bg-muted/40 p-3 rounded-lg flex justify-between items-center text-sm">
              <span className="text-text-muted">Sisa Tagihan:</span>
              <span className="font-bold text-warning tabular-nums">
                {rupiah(sisaTagihan)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metode-pembayaran">Metode Pembayaran</Label>
              <Select
                value={metodeBayar}
                onValueChange={(val) => setMetodeBayar(val as "tunai" | "transfer" | "qris")}
              >
                <SelectTrigger id="metode-pembayaran" className="w-full">
                  <SelectValue placeholder="Pilih metode..." />
                </SelectTrigger>
                <SelectContent className="tema-tagihan">
                  <SelectItem value="tunai">Tunai (Cash)</SelectItem>
                  <SelectItem value="transfer">Transfer Bank</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="jumlah-bayar">Jumlah Pembayaran (Rp)</Label>
                <button
                  type="button"
                  onClick={() => setJumlahBayar(String(sisaTagihan))}
                  className="text-xs text-primary hover:underline font-medium"
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
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalBayar(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-success text-[#04140A] hover:bg-success/90"
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

/** Kartu angka ringkas di bagian atas halaman tagihan. */
function KartuKpi({
  label,
  nilai,
  keterangan,
  ikon: Ikon,
  utama = false,
}: {
  label: string;
  nilai: string;
  keterangan?: string;
  ikon: LucideIcon;
  utama?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-colors",
        utama && "border-primary/40 bg-primary-soft/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <Ikon className={cn("size-4", utama ? "text-primary" : "text-text-muted")} />
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-bold tabular-nums tracking-tight text-text",
          utama && "text-primary",
        )}
      >
        {nilai}
      </p>
      {keterangan && <p className="mt-0.5 truncate text-[11px] text-text-muted">{keterangan}</p>}
    </div>
  );
}
