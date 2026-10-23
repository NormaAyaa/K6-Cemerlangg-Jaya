"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  CarFront,
  Ban,
  Loader2,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { kompresFoto, kompresThumbnail } from "@/lib/kompresi";
import { createClient } from "@/lib/supabase/client";

interface Props {
  woId: string;
  statusSaatIni: string;
  peran: "owner" | "admin" | "kepala_mekanik";
  userId: string;
  kepalaMekanikId: string;
  jumlahItemTagihan: number;
  statusBayarInvoice?: string | null;
  jumlahFotoKondisiAkhir: number;
}

export function TombolAksiStatus({
  woId,
  statusSaatIni,
  peran,
  userId,
  kepalaMekanikId,
  jumlahItemTagihan,
  statusBayarInvoice,
  jumlahFotoKondisiAkhir,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const isOwner = peran === "owner";
  const isAdmin = peran === "admin";
  const isKmTim = peran === "kepala_mekanik" && kepalaMekanikId === userId;

  // Dialog State
  const [dialogTunda, setDialogTunda] = useState(false);
  const [alasanTunda, setAlasanTunda] = useState("");

  const [dialogQcGagal, setDialogQcGagal] = useState(false);
  const [catatanQcGagal, setCatatanQcGagal] = useState("");

  const [dialogSerahkan, setDialogSerahkan] = useState(false);
  const [filesKondisiAkhir, setFilesKondisiAkhir] = useState<File[]>([]);
  const [previewsKondisiAkhir, setPreviewsKondisiAkhir] = useState<string[]>([]);

  const [dialogBatal, setDialogBatal] = useState(false);
  const [alasanBatal, setAlasanBatal] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // Panggil RPC ubah_status_wo
  async function eksekusiUbahStatus(statusTujuan: string, catatan?: string) {
    setLoading(true);
    setLoadingText("Memperbarui status Work Order...");

    try {
      const { error } = await supabase.rpc("ubah_status_wo", {
        p_wo: woId,
        p_status: statusTujuan,
        p_catatan: catatan?.trim() || undefined,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success(`Status Work Order berhasil diubah ke: ${statusTujuan.replace("_", " ")}`);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah status Work Order");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  }

  // Handle Tunda
  async function handleTunda() {
    if (!alasanTunda.trim()) {
      toast.error("Catatan alasan penundaan wajib diisi");
      return;
    }
    await eksekusiUbahStatus("tertunda", alasanTunda);
    setDialogTunda(false);
    setAlasanTunda("");
  }

  // Handle Selesai Dikerjakan
  async function handleSelesai() {
    if (jumlahItemTagihan < 1) {
      toast.error("Catat minimal 1 jasa atau spare part sebelum menyelesaikan WO");
      return;
    }
    await eksekusiUbahStatus("selesai");
  }

  // Handle QC Gagal
  async function handleQcGagal() {
    if (!catatanQcGagal.trim()) {
      toast.error("Catatan perbaikan hasil QC wajib diisi");
      return;
    }
    await eksekusiUbahStatus("dikerjakan", catatanQcGagal);
    setDialogQcGagal(false);
    setCatatanQcGagal("");
  }

  // Handle Foto Kondisi Akhir pada Penyerahan Mobil
  function handleTambahFotoAkhir(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const total = filesKondisiAkhir.length + files.length;
    if (total > 4) {
      toast.error("Maksimal 4 foto kondisi akhir");
      return;
    }

    setFilesKondisiAkhir([...filesKondisiAkhir, ...files]);
    setPreviewsKondisiAkhir([...previewsKondisiAkhir, ...files.map((f) => URL.createObjectURL(f))]);
  }

  function hapusFotoAkhir(index: number) {
    setFilesKondisiAkhir(filesKondisiAkhir.filter((_, i) => i !== index));
    setPreviewsKondisiAkhir(previewsKondisiAkhir.filter((_, i) => i !== index));
  }

  // Handle Serahkan Mobil
  async function handleSerahkanMobil() {
    if (statusBayarInvoice !== "lunas") {
      toast.error("Kendaraan hanya boleh diserahkan setelah invoice terbit dan berstatus lunas");
      return;
    }

    if (jumlahFotoKondisiAkhir === 0 && filesKondisiAkhir.length === 0) {
      toast.error("Minimal 1 foto kondisi akhir harus diunggah sebelum menyerahkan kendaraan");
      return;
    }

    setLoading(true);

    try {
      if (filesKondisiAkhir.length > 0) {
        setLoadingText("Mengompresi dan mengunggah foto kondisi akhir...");

        for (let i = 0; i < filesKondisiAkhir.length; i++) {
          const file = filesKondisiAkhir[i];
          const idFoto = crypto.randomUUID();
          const fotoWebp = await kompresFoto(file);
          const thumbWebp = await kompresThumbnail(file);

          const pathFoto = `${woId}/kondisi_akhir/${idFoto}.webp`;
          const pathThumb = `${woId}/kondisi_akhir/thumb/${idFoto}.webp`;

          await Promise.all([
            supabase.storage.from("foto-wo").upload(pathFoto, fotoWebp, { contentType: "image/webp" }),
            supabase.storage.from("foto-wo").upload(pathThumb, thumbWebp, { contentType: "image/webp" }),
          ]);

          await supabase.from("work_order_photos").insert({
            work_order_id: woId,
            jenis: "kondisi_akhir",
            path: pathFoto,
            diunggah_oleh: userId,
          });
        }
      }

      setLoadingText("Menyerahkan kendaraan...");
      const { error } = await supabase.rpc("ubah_status_wo", {
        p_wo: woId,
        p_status: "diambil",
      });

      if (error) throw new Error(error.message);

      toast.success("Kendaraan berhasil diserahkan kepada pelanggan!");
      setDialogSerahkan(false);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyerahkan kendaraan");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  }

  // Handle Batal
  async function handleBatal() {
    if (!alasanBatal.trim()) {
      toast.error("Alasan pembatalan wajib diisi");
      return;
    }
    await eksekusiUbahStatus("dibatalkan", alasanBatal);
    setDialogBatal(false);
    setAlasanBatal("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. TUNDA (Status: dikerjakan | Pelaku: KM tim / Owner) */}
      {statusSaatIni === "dikerjakan" && (isKmTim || isOwner) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogTunda(true)}
          disabled={loading}
          className="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-mono text-xs gap-1.5"
        >
          <Pause className="size-3.5" />
          Tunda
        </Button>
      )}

      {/* 2. LANJUTKAN (Status: tertunda | Pelaku: KM tim / Owner) */}
      {statusSaatIni === "tertunda" && (isKmTim || isOwner) && (
        <Button
          size="sm"
          onClick={() => eksekusiUbahStatus("dikerjakan")}
          disabled={loading}
          className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30 font-mono text-xs gap-1.5"
        >
          <Play className="size-3.5" />
          Lanjutkan Pengerjaan
        </Button>
      )}

      {/* 3. SELESAI DIKERJAKAN (Status: dikerjakan | Pelaku: KM tim / Owner) */}
      {statusSaatIni === "dikerjakan" && (isKmTim || isOwner) && (
        <Button
          size="sm"
          onClick={handleSelesai}
          disabled={loading}
          className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30 font-mono text-xs gap-1.5"
        >
          <CheckCircle className="size-3.5" />
          Selesai Dikerjakan
        </Button>
      )}

      {/* 4. VERIFIKASI QC (Status: selesai | Pelaku: KM tim / Owner) */}
      {statusSaatIni === "selesai" && (isKmTim || isOwner) && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-xs gap-1.5"
            onClick={() => setDialogQcGagal(true)}
            disabled={loading}
          >
            <XCircle className="size-3.5" />
            QC Gagal
          </Button>

          <Button
            size="sm"
            className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-xs gap-1.5 border"
            onClick={() => eksekusiUbahStatus("siap_diambil")}
            disabled={loading}
          >
            <CheckCircle className="size-3.5" />
            QC Lulus (Siap Diambil)
          </Button>
        </>
      )}

      {/* 5. SERAHKAN MOBIL (Status: siap_diambil | Pelaku: Admin / Owner) */}
      {statusSaatIni === "siap_diambil" && (isAdmin || isOwner) && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs gap-1.5 shadow-md shadow-emerald-950/30"
          onClick={() => setDialogSerahkan(true)}
          disabled={loading}
        >
          <CarFront className="size-3.5" />
          Serahkan Kendaraan
        </Button>
      )}

      {/* 6. BATALKAN WO (Status: menunggu, dikerjakan, tertunda | Pelaku: Admin / Owner) */}
      {["menunggu", "dikerjakan", "tertunda"].includes(statusSaatIni) && (isAdmin || isOwner) && (
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-mono text-xs gap-1.5"
          onClick={() => setDialogBatal(true)}
          disabled={loading}
        >
          <Ban className="size-3.5" />
          Batalkan WO
        </Button>
      )}

      {/* DIALOG TUNDA */}
      <Dialog open={dialogTunda} onOpenChange={setDialogTunda}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold font-mono text-base">
              Tunda Pengerjaan Work Order
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Pekerjaan akan dihentikan sementara. Masukkan alasan penundaan (misalnya menunggu spare part datang).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="alasan-tunda" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
              Alasan Penundaan *
            </Label>
            <Textarea
              id="alasan-tunda"
              value={alasanTunda}
              onChange={(e) => setAlasanTunda(e.target.value)}
              placeholder="Contoh: Menunggu kiriman kampas rem dari distributor..."
              rows={3}
              className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-[#FF2E75]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogTunda(false)}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleTunda}
              disabled={loading || !alasanTunda.trim()}
              className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Tunda Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG QC GAGAL */}
      <Dialog open={dialogQcGagal} onOpenChange={setDialogQcGagal}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-400 font-semibold font-mono text-base">
              Hasil Pemeriksaan: QC Gagal
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Kendaraan akan dikembalikan ke status &quot;Dikerjakan&quot;. Wajib mengisi catatan perbaikan yang harus dilakukan mekanik.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="catatan-qc" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
              Catatan Perbaikan *
            </Label>
            <Textarea
              id="catatan-qc"
              value={catatanQcGagal}
              onChange={(e) => setCatatanQcGagal(e.target.value)}
              placeholder="Contoh: Rem masih berdecit pada kecepatan rendah, periksa kembali pin kaliper..."
              rows={3}
              className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-[#FF2E75]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogQcGagal(false)}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleQcGagal}
              disabled={loading || !catatanQcGagal.trim()}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/30"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Kembalikan ke Pengerjaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG SERAHKAN MOBIL */}
      <Dialog open={dialogSerahkan} onOpenChange={setDialogSerahkan}>
        <DialogContent className="max-w-lg bg-[#111116] border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold font-mono text-base">
              Penyerahan Kendaraan kepada Pelanggan
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Kendaraan telah selesai dikerjakan dan siap diserahkan kepada pemilik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Status Invoice */}
            <div
              className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                statusBayarInvoice === "lunas"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-400"
              }`}
            >
              {statusBayarInvoice === "lunas" ? (
                <>
                  <CheckCircle className="size-4 shrink-0" />
                  <span>Invoice berstatus LUNAS. Syarat penyerahan terpenuhi.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>
                    Invoice belum lunas ({statusBayarInvoice ? `status: ${statusBayarInvoice}` : "belum terbit"}).
                    Pelanggan harus melunasi tagihan di tab Tagihan sebelum kendaraan diserahkan.
                  </span>
                </>
              )}
            </div>

            {/* Unggah Foto Kondisi Akhir */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                  Foto Kondisi Akhir (1 - 4 foto) *
                </Label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {jumlahFotoKondisiAkhir + filesKondisiAkhir.length} foto tersedia
                </span>
              </div>

              {jumlahFotoKondisiAkhir > 0 && (
                <p className="text-xs text-emerald-400 flex items-center gap-1 font-mono font-medium">
                  <CheckCircle className="size-3.5" />
                  Sudah ada {jumlahFotoKondisiAkhir} foto kondisi akhir tersimpan.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {previewsKondisiAkhir.map((src, index) => (
                  <div key={index} className="relative aspect-video rounded-md border border-zinc-800 overflow-hidden bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Kondisi Akhir" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => hapusFotoAkhir(index)}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-zinc-300 hover:text-white hover:bg-rose-600 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}

                {jumlahFotoKondisiAkhir + filesKondisiAkhir.length < 4 && (
                  <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-zinc-800 rounded-md cursor-pointer hover:bg-zinc-900/60 hover:border-zinc-700 transition-colors">
                    <Upload className="size-4 text-[#FF2E75] mb-1 opacity-80" />
                    <span className="text-[11px] font-medium text-white">+ Foto Akhir</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleTambahFotoAkhir}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogSerahkan(false)}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleSerahkanMobil}
              disabled={
                loading ||
                statusBayarInvoice !== "lunas" ||
                (jumlahFotoKondisiAkhir === 0 && filesKondisiAkhir.length === 0)
              }
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950/30"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  {loadingText || "Memproses..."}
                </>
              ) : (
                "Konfirmasi Serahkan Kendaraan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG BATALKAN WO */}
      <Dialog open={dialogBatal} onOpenChange={setDialogBatal}>
        <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-400 font-semibold font-mono text-base">
              Batalkan Work Order
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Tindakan ini tidak dapat dibatalkan. Seluruh spare part yang telah dicatat akan dikembalikan ke stok
              inventory secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="alasan-batal" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
              Alasan Pembatalan *
            </Label>
            <Textarea
              id="alasan-batal"
              value={alasanBatal}
              onChange={(e) => setAlasanBatal(e.target.value)}
              placeholder="Contoh: Pelanggan membatalkan servis karena kendaraan akan dijual..."
              rows={3}
              className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-[#FF2E75]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogBatal(false)}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleBatal}
              disabled={loading || !alasanBatal.trim()}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/30"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Batalkan Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
