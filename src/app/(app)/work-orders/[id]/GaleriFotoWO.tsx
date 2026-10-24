"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Plus, Upload, X, Loader2, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { kompresFoto, kompresThumbnail } from "@/lib/kompresi";
import { createClient } from "@/lib/supabase/client";

export interface FotoWOItem {
  id: string;
  jenis: "stnk" | "kondisi_awal" | "kondisi_akhir" | "pengerjaan";
  path: string;
  urlOriginal: string;
  urlThumb: string;
}

interface Props {
  woId: string;
  daftarFoto: FotoWOItem[];
  statusSaatIni: string;
  peran: "owner" | "admin" | "kepala_mekanik";
  userId: string;
  kepalaMekanikId: string;
}

export function GaleriFotoWO({
  woId,
  daftarFoto,
  statusSaatIni,
  peran,
  userId,
  kepalaMekanikId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const isOwner = peran === "owner";
  const isKmTim = peran === "kepala_mekanik" && kepalaMekanikId === userId;
  const bolehUnggahPengerjaan = (isKmTim || isOwner) && statusSaatIni === "dikerjakan";

  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [judulPreview, setJudulPreview] = useState("");

  const [dialogUnggah, setDialogUnggah] = useState(false);
  const [filePengerjaan, setFilePengerjaan] = useState<File | null>(null);
  const [previewUnggah, setPreviewUnggah] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fotoStnk = daftarFoto.find((f) => f.jenis === "stnk");
  const fotoKondisiAwal = daftarFoto.filter((f) => f.jenis === "kondisi_awal");
  const fotoPengerjaan = daftarFoto.filter((f) => f.jenis === "pengerjaan");
  const fotoKondisiAkhir = daftarFoto.filter((f) => f.jenis === "kondisi_akhir");

  async function handleUnggahFotoPengerjaan() {
    if (!filePengerjaan) {
      toast.error("Pilih foto pengerjaan terlebih dahulu");
      return;
    }

    setUploading(true);

    try {
      const idFoto = crypto.randomUUID();
      const fotoWebp = await kompresFoto(filePengerjaan);
      const thumbWebp = await kompresThumbnail(filePengerjaan);

      const pathFoto = `${woId}/pengerjaan/${idFoto}.webp`;
      const pathThumb = `${woId}/pengerjaan/thumb/${idFoto}.webp`;

      const [resOri] = await Promise.all([
        supabase.storage.from("foto-wo").upload(pathFoto, fotoWebp, { contentType: "image/webp" }),
        supabase.storage.from("foto-wo").upload(pathThumb, thumbWebp, { contentType: "image/webp" }),
      ]);

      if (resOri.error) throw new Error(resOri.error.message);

      await supabase.from("work_order_photos").insert({
        work_order_id: woId,
        jenis: "pengerjaan",
        path: pathFoto,
        diunggah_oleh: userId,
      });

      toast.success("Foto pengerjaan berhasil diunggah");
      setDialogUnggah(false);
      setFilePengerjaan(null);
      setPreviewUnggah(null);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunggah foto pengerjaan");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Foto Masuk: STNK & Kondisi Awal */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-2">
          <ImageIcon className="size-4 text-[#FF2E75]" />
          Dokumentasi Masuk (STNK & Kondisi Awal)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {/* STNK */}
          {fotoStnk && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400">Foto STNK:</span>
              <div
                onClick={() => {
                  setPreviewFoto(fotoStnk.urlOriginal);
                  setJudulPreview("Foto STNK Kendaraan");
                }}
                className="relative aspect-video rounded-lg border border-zinc-800 overflow-hidden cursor-pointer group bg-zinc-900/80 shadow-inner"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoStnk.urlThumb || fotoStnk.urlOriginal}
                  alt="Foto STNK"
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="size-4 text-[#FF2E75]" />
                </div>
              </div>
            </div>
          )}

          {/* Kondisi Awal */}
          {fotoKondisiAwal.map((f, idx) => (
            <div key={f.id} className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400">Awal #{idx + 1}:</span>
              <div
                onClick={() => {
                  setPreviewFoto(f.urlOriginal);
                  setJudulPreview(`Foto Kondisi Awal #${idx + 1}`);
                }}
                className="relative aspect-video rounded-lg border border-zinc-800 overflow-hidden cursor-pointer group bg-zinc-900/80 shadow-inner"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.urlThumb || f.urlOriginal}
                  alt={`Kondisi Awal ${idx + 1}`}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="size-4 text-[#FF2E75]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Foto Pengerjaan */}
      <div className="space-y-3 pt-3 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
            Foto Proses Pengerjaan ({fotoPengerjaan.length}):
          </h4>
          {bolehUnggahPengerjaan && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogUnggah(true)}
              className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs gap-1.5"
            >
              <Plus className="size-3.5 text-[#FF2E75]" />
              Unggah Foto Pengerjaan
            </Button>
          )}
        </div>

        {fotoPengerjaan.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono italic">Belum ada foto proses pengerjaan.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {fotoPengerjaan.map((f, idx) => (
              <div
                key={f.id}
                onClick={() => {
                  setPreviewFoto(f.urlOriginal);
                  setJudulPreview(`Foto Pengerjaan #${idx + 1}`);
                }}
                className="relative aspect-video rounded-lg border border-zinc-800 overflow-hidden cursor-pointer group bg-zinc-900/80 shadow-inner"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.urlThumb || f.urlOriginal}
                  alt={`Pengerjaan ${idx + 1}`}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="size-4 text-[#FF2E75]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Foto Kondisi Akhir */}
      {fotoKondisiAkhir.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
          <h4 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
            Foto Kondisi Akhir Penyerahan ({fotoKondisiAkhir.length}):
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {fotoKondisiAkhir.map((f, idx) => (
              <div
                key={f.id}
                onClick={() => {
                  setPreviewFoto(f.urlOriginal);
                  setJudulPreview(`Foto Kondisi Akhir #${idx + 1}`);
                }}
                className="relative aspect-video rounded-lg border border-zinc-800 overflow-hidden cursor-pointer group bg-zinc-900/80 shadow-inner"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.urlThumb || f.urlOriginal}
                  alt={`Kondisi Akhir ${idx + 1}`}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="size-4 text-[#FF2E75]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Dialog Preview Ukuran Penuh */}
      <Dialog open={Boolean(previewFoto)} onOpenChange={() => setPreviewFoto(null)}>
        <DialogContent className="max-w-3xl p-3 bg-[#111116] border-zinc-800 text-zinc-100">
          <DialogHeader className="px-2 pt-1">
            <DialogTitle className="text-sm font-mono text-white">{judulPreview}</DialogTitle>
          </DialogHeader>
          {previewFoto && (
            <div className="mt-2 rounded-lg overflow-hidden bg-black/95 flex items-center justify-center max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewFoto} alt="Preview Foto" className="max-h-[75vh] w-auto object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Unggah Foto Pengerjaan */}
      <Dialog open={dialogUnggah} onOpenChange={setDialogUnggah}>
        <DialogContent className="max-w-md bg-[#111116] border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold font-mono text-base">
              Unggah Foto Pengerjaan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {previewUnggah ? (
              <div className="relative aspect-video rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUnggah} alt="Preview" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setFilePengerjaan(null);
                    setPreviewUnggah(null);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/70 rounded-full text-zinc-300 hover:text-white hover:bg-rose-600 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-900/60 hover:border-zinc-700 transition-colors">
                <Upload className="size-6 text-[#FF2E75] mb-1 opacity-80" />
                <span className="text-xs font-medium text-white">Pilih Foto Pengerjaan</span>
                <span className="text-[10px] font-mono text-zinc-500">Otomatis WebP 1600px & Thumbnail 320px</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFilePengerjaan(f);
                      setPreviewUnggah(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogUnggah(false)}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleUnggahFotoPengerjaan}
              disabled={uploading || !filePengerjaan}
              className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30"
            >
              {uploading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Unggah Foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
