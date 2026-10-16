"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import imageCompression from "browser-image-compression";
import { Image as ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

const skemaBengkel = z.object({
  nama: z.string().trim().min(1, "Nama bengkel wajib diisi"),
  alamat: z.string().trim().min(1, "Alamat bengkel wajib diisi"),
  telepon: z.string().trim().min(1, "Nomor telepon wajib diisi"),
  jam_buka: z.string().trim().optional(),
});
type DataBengkel = z.infer<typeof skemaBengkel>;

type Props = {
  setelan: {
    id: number;
    nama: string;
    alamat: string;
    telepon: string;
    jam_buka: string | null;
    logo_path: string | null;
    galeri_paths: string[];
  };
};

export function FormSetelan({ setelan }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [loadingLogo, setLoadingLogo] = useState(false);
  const [loadingGaleri, setLoadingGaleri] = useState(false);

  const form = useForm<DataBengkel>({
    resolver: zodResolver(skemaBengkel),
    defaultValues: {
      nama: setelan.nama,
      alamat: setelan.alamat,
      telepon: setelan.telepon,
      jam_buka: setelan.jam_buka ?? "",
    },
  });

  // Kompresi gambar browser (PRD 11.4: max 1600 px, WebP, mutu 0.8)
  async function kompresGambar(file: File): Promise<File> {
    const opsi = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.8,
    };
    try {
      return await imageCompression(file, opsi);
    } catch {
      return file;
    }
  }

  // 1. Simpan Informasi Bengkel
  async function simpanInformasi(data: DataBengkel) {
    const { error } = await supabase
      .from("workshop_settings")
      .update({
        nama: data.nama,
        alamat: data.alamat,
        telepon: data.telepon,
        jam_buka: data.jam_buka || null,
      })
      .eq("id", 1);

    if (error) {
      toast.error(error.message || "Gagal menyimpan informasi bengkel");
      return;
    }

    toast.success("Informasi bengkel berhasil diperbarui");
    router.refresh();
  }

  // 2. Upload Logo Bengkel
  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingLogo(true);
    try {
      const fileWebp = await kompresGambar(file);
      const namaFile = `logo/logo-${Date.now()}.webp`;

      const { error: errUpload } = await supabase.storage
        .from("publik")
        .upload(namaFile, fileWebp, {
          cacheControl: "31536000",
          upsert: true,
        });

      if (errUpload) {
        toast.error(errUpload.message || "Gagal mengunggah logo ke storage");
        return;
      }

      const { error: errUpdate } = await supabase
        .from("workshop_settings")
        .update({ logo_path: namaFile })
        .eq("id", 1);

      if (errUpdate) {
        toast.error("Logo terunggah tetapi gagal memperbarui data setelan");
        return;
      }

      toast.success("Logo bengkel berhasil diperbarui");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat memproses logo");
    } finally {
      setLoadingLogo(false);
      e.target.value = "";
    }
  }

  // 3. Upload Foto Galeri
  async function handleUploadGaleri(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (setelan.galeri_paths.length >= 6) {
      toast.error("Maksimal 6 foto pada galeri");
      return;
    }

    setLoadingGaleri(true);
    try {
      const fileWebp = await kompresGambar(file);
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const namaFile = `galeri/galeri-${Date.now()}-${randomSuffix}.webp`;

      const { error: errUpload } = await supabase.storage
        .from("publik")
        .upload(namaFile, fileWebp, {
          cacheControl: "31536000",
          upsert: true,
        });

      if (errUpload) {
        toast.error(errUpload.message || "Gagal mengunggah foto galeri");
        return;
      }

      const updatedGaleri = [...setelan.galeri_paths, namaFile];
      const { error: errUpdate } = await supabase
        .from("workshop_settings")
        .update({ galeri_paths: updatedGaleri })
        .eq("id", 1);

      if (errUpdate) {
        toast.error("Foto terunggah tapi gagal memperbarui galeri");
        return;
      }

      toast.success("Foto berhasil ditambahkan ke galeri");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat memproses foto galeri");
    } finally {
      setLoadingGaleri(false);
      e.target.value = "";
    }
  }

  // 4. Hapus Foto Galeri
  async function handleHapusGaleri(path: string) {
    const updatedGaleri = setelan.galeri_paths.filter((p) => p !== path);

    const { error: errUpdate } = await supabase
      .from("workshop_settings")
      .update({ galeri_paths: updatedGaleri })
      .eq("id", 1);

    if (errUpdate) {
      toast.error("Gagal menghapus foto dari data galeri");
      return;
    }

    // Hapus file dari bucket storage
    await supabase.storage.from("publik").remove([path]);

    toast.success("Foto galeri berhasil dihapus");
    router.refresh();
  }

  const logoUrl = setelan.logo_path
    ? supabase.storage.from("publik").getPublicUrl(setelan.logo_path).data.publicUrl
    : null;

  return (
    <div className="space-y-6">
      {/* 1. INFORMASI BENGKEL */}
      <Card>
        <CardHeader>
          <CardTitle>Data Bengkel</CardTitle>
          <CardDescription>
            Nama, alamat, telepon, dan jam operasional yang tampil pada sidebar, cetak invoice, dan informasi umum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="form-data-bengkel" onSubmit={form.handleSubmit(simpanInformasi)} noValidate>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="nama"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                    <FieldLabel htmlFor="nama-bengkel">Nama Bengkel *</FieldLabel>
                    <Input {...field} id="nama-bengkel" aria-invalid={fieldState.invalid} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="telepon"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="telepon-bengkel">Nomor Telepon *</FieldLabel>
                    <Input {...field} id="telepon-bengkel" aria-invalid={fieldState.invalid} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="jam_buka"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="jam-buka">Jam Buka</FieldLabel>
                    <Input
                      {...field}
                      id="jam-buka"
                      placeholder="Contoh: Senin sampai Sabtu, 08.00 sampai 17.00"
                    />
                  </Field>
                )}
              />

              <Controller
                name="alamat"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                    <FieldLabel htmlFor="alamat-bengkel">Alamat Lengkap *</FieldLabel>
                    <Textarea {...field} id="alamat-bengkel" rows={2} aria-invalid={fieldState.invalid} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Data Bengkel"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. LOGO BENGKEL */}
      <Card>
        <CardHeader>
          <CardTitle>Logo Bengkel</CardTitle>
          <CardDescription>
            Logo disimpan di bucket publik dan ditampilkan di sidebar dan kop invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-app">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo Bengkel" className="size-full object-cover" />
              ) : (
                <div className="text-center text-xs text-text-muted">
                  <ImageIcon className="mx-auto mb-1 size-6 opacity-40" />
                  Belum ada
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-text">Unggah Logo Baru</p>
              <p className="text-xs text-text-muted">
                Format gambar (PNG, JPG, WebP), otomatis dikompresi ke WebP sebelum diunggah (maks 1 MB).
              </p>
              <label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleUploadLogo}
                  disabled={loadingLogo}
                />
                <Button variant="outline" size="sm" asChild disabled={loadingLogo} className="cursor-pointer gap-2">
                  <span>
                    {loadingLogo ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {loadingLogo ? "Mengunggah..." : "Pilih File Logo"}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. GALERI HALAMAN DEPAN */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Galeri Halaman Depan</CardTitle>
              <CardDescription>
                Koleksi foto bengkel (3 sampai 6 foto) yang dapat diakses publik. Saat ini: {setelan.galeri_paths.length}/6 foto.
              </CardDescription>
            </div>
            {setelan.galeri_paths.length < 6 && (
              <label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleUploadGaleri}
                  disabled={loadingGaleri}
                />
                <Button size="sm" asChild disabled={loadingGaleri} className="cursor-pointer gap-2">
                  <span>
                    {loadingGaleri ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {loadingGaleri ? "Mengunggah..." : "Tambah Foto"}
                  </span>
                </Button>
              </label>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {setelan.galeri_paths.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
              Belum ada foto di galeri. Klik &quot;Tambah Foto&quot; untuk mengunggah.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {setelan.galeri_paths.map((path, idx) => {
                const fotoUrl = supabase.storage.from("publik").getPublicUrl(path).data.publicUrl;
                return (
                  <div key={path} className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-bg-app">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotoUrl} alt={`Galeri ${idx + 1}`} className="size-full object-cover transition-transform group-hover:scale-105" />
                    <button
                      type="button"
                      onClick={() => handleHapusGaleri(path)}
                      className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-rose-600 group-hover:opacity-100"
                      title="Hapus foto ini"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
