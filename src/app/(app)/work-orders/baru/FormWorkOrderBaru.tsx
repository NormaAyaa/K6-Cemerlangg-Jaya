"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  User,
  Upload,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { kompresFoto, kompresThumbnail } from "@/lib/kompresi";
import { createClient } from "@/lib/supabase/client";

interface KepalaMekanikItem {
  id: string;
  nama: string;
  jumlahWoAktif: number;
}

export function FormWorkOrderBaru({
  daftarTim,
  userId,
}: {
  daftarTim: KepalaMekanikItem[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  // Status Pencarian Kendaraan
  const [platInput, setPlatInput] = useState("");
  const [sedangCariPlat, setSedangCariPlat] = useState(false);
  const [statusPlat, setStatusPlat] = useState<"idle" | "ditemukan" | "belum_terdaftar">("idle");
  const [kendaraanDitemukan, setKendaraanDitemukan] = useState<{
    id: string;
    plat: string;
    merek_model: string;
    tahun: number | null;
    warna: string | null;
    transmisi: string | null;
    customer: {
      id: string;
      nama: string;
      telepon: string;
      email: string | null;
      alamat: string | null;
    };
  } | null>(null);

  // Form Pelanggan Baru / Lama
  const [tipePelanggan, setTipePelanggan] = useState<"lama" | "baru">("baru");
  const [cariTelepon, setCariTelepon] = useState("");
  const [pelangganLamaPilihan, setPelangganLamaPilihan] = useState<{
    id: string;
    nama: string;
    telepon: string;
  } | null>(null);
  const [daftarPelangganLama, setDaftarPelangganLama] = useState<
    Array<{ id: string; nama: string; telepon: string }>
  >([]);

  // Field Pelanggan Baru
  const [pelangganTipe, setPelangganTipe] = useState<"perorangan" | "perusahaan">("perorangan");
  const [pelangganNama, setPelangganNama] = useState("");
  const [pelangganTelepon, setPelangganTelepon] = useState("");
  const [pelangganEmail, setPelangganEmail] = useState("");
  const [pelangganAlamat, setPelangganAlamat] = useState("");

  // Field Kendaraan Baru
  const [kendaraanMerek, setKendaraanMerek] = useState("");
  const [kendaraanTahun, setKendaraanTahun] = useState<number | "">("");
  const [kendaraanWarna, setKendaraanWarna] = useState("");
  const [kendaraanTransmisi, setKendaraanTransmisi] = useState<"AT" | "MT">("MT");

  // Bagian Data Masuk WO
  const [odometer, setOdometer] = useState<number | "">("");
  const [keluhan, setKeluhan] = useState("");
  const [kepalaMekanikId, setKepalaMekanikId] = useState(daftarTim[0]?.id ?? "");

  // Foto-foto
  const [fileStnk, setFileStnk] = useState<File | null>(null);
  const [previewStnk, setPreviewStnk] = useState<string | null>(null);
  const [filesKondisiAwal, setFilesKondisiAwal] = useState<File[]>([]);
  const [previewsKondisiAwal, setPreviewsKondisiAwal] = useState<string[]>([]);

  // Loading submit
  const [memproses, setMemproses] = useState(false);
  const [statusProses, setStatusProses] = useState("");

  // Cari Plat Nomor
  async function periksaPlat() {
    const platBersih = platInput.trim().toUpperCase().replace(/\s+/g, " ");
    if (!platBersih) return;

    setSedangCariPlat(true);
    setPlatInput(platBersih);

    const { data: mobil, error } = await supabase
      .from("vehicles")
      .select("id, plat, merek_model, tahun, warna, transmisi, customers(id, nama, telepon, email, alamat)")
      .ilike("plat", platBersih)
      .maybeSingle();

    setSedangCariPlat(false);

    if (error) {
      toast.error("Gagal memeriksa plat nomor");
      return;
    }

    if (mobil && mobil.customers) {
      setKendaraanDitemukan({
        id: mobil.id,
        plat: mobil.plat,
        merek_model: mobil.merek_model,
        tahun: mobil.tahun,
        warna: mobil.warna,
        transmisi: mobil.transmisi,
        customer: mobil.customers as any,
      });
      setStatusPlat("ditemukan");
    } else {
      setKendaraanDitemukan(null);
      setStatusPlat("belum_terdaftar");
    }
  }

  // Cari Pelanggan Berdasarkan Nomor Telepon (untuk opsi pelanggan lama)
  async function cariPelangganByTelepon(telp: string) {
    setCariTelepon(telp);
    if (telp.length >= 3) {
      const { data } = await supabase
        .from("customers")
        .select("id, nama, telepon")
        .ilike("telepon", `%${telp}%`)
        .limit(5);
      setDaftarPelangganLama(data ?? []);
    } else {
      setDaftarPelangganLama([]);
    }
  }

  // Handle Foto STNK
  function handlePilihStnk(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileStnk(file);
      setPreviewStnk(URL.createObjectURL(file));
    }
  }

  // Handle Foto Kondisi Awal
  function handleTambahFotoAwal(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const total = filesKondisiAwal.length + files.length;
    if (total > 6) {
      toast.error("Maksimal 6 foto kondisi awal");
      return;
    }

    const newFiles = [...filesKondisiAwal, ...files];
    const newPreviews = [...previewsKondisiAwal, ...files.map((f) => URL.createObjectURL(f))];
    setFilesKondisiAwal(newFiles);
    setPreviewsKondisiAwal(newPreviews);
  }

  function hapusFotoAwal(index: number) {
    setFilesKondisiAwal(filesKondisiAwal.filter((_, i) => i !== index));
    setPreviewsKondisiAwal(previewsKondisiAwal.filter((_, i) => i !== index));
  }

  // Submit Simpan Work Order
  async function simpanWorkOrder() {
    // Validasi Kendaraan & Pelanggan
    let vehicleId = kendaraanDitemukan?.id;

    if (!vehicleId) {
      // Jika plat belum terdaftar, validasi isian form pelanggan & kendaraan baru
      if (statusPlat !== "belum_terdaftar") {
        toast.error("Silakan cari atau periksa plat nomor terlebih dahulu");
        return;
      }

      if (!kendaraanMerek.trim()) {
        toast.error("Merek dan model kendaraan wajib diisi");
        return;
      }

      let customerId = pelangganLamaPilihan?.id;

      if (!customerId) {
        if (!pelangganNama.trim()) {
          toast.error("Nama pelanggan wajib diisi");
          return;
        }
        if (!/^[0-9]{10,14}$/.test(pelangganTelepon.trim())) {
          toast.error("Nomor telepon wajib berisi 10 sampai 14 digit angka");
          return;
        }
      }
    }

    // Validasi Data Masuk WO
    if (odometer === "" || Number(odometer) < 0) {
      toast.error("Odometer wajib diisi dengan angka minimal 0");
      return;
    }

    if (!keluhan.trim()) {
      toast.error("Keluhan wajib diisi");
      return;
    }

    if (!kepalaMekanikId) {
      toast.error("Pilih tim Kepala Mekanik");
      return;
    }

    if (!fileStnk) {
      toast.error("Foto STNK wajib diunggah (1 foto)");
      return;
    }

    if (filesKondisiAwal.length === 0) {
      toast.error("Minimal 1 foto kondisi awal wajib diunggah");
      return;
    }

    setMemproses(true);

    try {
      // 1. Buat Pelanggan & Kendaraan jika belum ada
      if (!vehicleId) {
        let customerId = pelangganLamaPilihan?.id;

        if (!customerId) {
          setStatusProses("Menyimpan data pelanggan...");
          const { data: custBaru, error: errCust } = await supabase
            .from("customers")
            .insert({
              tipe: pelangganTipe,
              nama: pelangganNama.trim(),
              telepon: pelangganTelepon.trim(),
              email: pelangganEmail.trim() || null,
              alamat: pelangganAlamat.trim() || null,
            })
            .select("id")
            .single();

          if (errCust) {
            if (errCust.code === "23505") {
              throw new Error("Nomor telepon pelanggan sudah terdaftar");
            }
            throw new Error("Gagal menyimpan data pelanggan baru: " + errCust.message);
          }
          customerId = custBaru.id;
        }

        setStatusProses("Menyimpan data kendaraan...");
        const { data: vehBaru, error: errVeh } = await supabase
          .from("vehicles")
          .insert({
            customer_id: customerId,
            plat: platInput.trim().toUpperCase(),
            merek_model: kendaraanMerek.trim(),
            tahun: kendaraanTahun ? Number(kendaraanTahun) : null,
            warna: kendaraanWarna.trim() || null,
            transmisi: kendaraanTransmisi,
          })
          .select("id")
          .single();

        if (errVeh) {
          throw new Error("Gagal menyimpan data kendaraan: " + errVeh.message);
        }
        vehicleId = vehBaru.id;
      }

      // 2. Buat Work Order via RPC buat_work_order
      setStatusProses("Membuat Work Order...");
      const { data: woId, error: rpcError } = await supabase.rpc("buat_work_order", {
        p_vehicle_id: vehicleId,
        p_kepala_mekanik_id: kepalaMekanikId,
        p_odometer: Number(odometer),
        p_keluhan: keluhan.trim(),
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Gagal membuat Work Order");
      }

      // 3. Kompresi dan Unggah Foto STNK
      setStatusProses("Mengompresi dan mengunggah foto STNK...");
      const idStnk = crypto.randomUUID();
      const stnkWebp = await kompresFoto(fileStnk);
      const stnkThumbWebp = await kompresThumbnail(fileStnk);

      const pathStnk = `${woId}/stnk/${idStnk}.webp`;
      const pathThumbStnk = `${woId}/stnk/thumb/${idStnk}.webp`;

      const [resStnk, resThumbStnk] = await Promise.all([
        supabase.storage.from("foto-wo").upload(pathStnk, stnkWebp, { contentType: "image/webp" }),
        supabase.storage.from("foto-wo").upload(pathThumbStnk, stnkThumbWebp, { contentType: "image/webp" }),
      ]);

      if (resStnk.error) {
        console.error("Gagal unggah foto STNK:", resStnk.error);
      } else {
        await supabase.from("work_order_photos").insert({
          work_order_id: woId,
          jenis: "stnk",
          path: pathStnk,
          diunggah_oleh: userId,
        });
      }

      // 4. Kompresi dan Unggah Foto Kondisi Awal
      setStatusProses(`Mengompresi dan mengunggah ${filesKondisiAwal.length} foto kondisi awal...`);
      for (let i = 0; i < filesKondisiAwal.length; i++) {
        const file = filesKondisiAwal[i];
        const idFoto = crypto.randomUUID();
        const fotoWebp = await kompresFoto(file);
        const thumbWebp = await kompresThumbnail(file);

        const pathFoto = `${woId}/kondisi_awal/${idFoto}.webp`;
        const pathThumb = `${woId}/kondisi_awal/thumb/${idFoto}.webp`;

        await Promise.all([
          supabase.storage.from("foto-wo").upload(pathFoto, fotoWebp, { contentType: "image/webp" }),
          supabase.storage.from("foto-wo").upload(pathThumb, thumbWebp, { contentType: "image/webp" }),
        ]);

        await supabase.from("work_order_photos").insert({
          work_order_id: woId,
          jenis: "kondisi_awal",
          path: pathFoto,
          diunggah_oleh: userId,
        });
      }

      toast.success("Work Order berhasil dibuat!");
      router.push(`/work-orders/${woId}`);
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat membuat Work Order");
    } finally {
      setMemproses(false);
      setStatusProses("");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* 1. KENDARAAN & PELANGGAN */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="size-5 text-primary" />
            Identifikasi Kendaraan & Pelanggan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Input Pencarian Plat */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="plat" className="text-sm font-medium">
                Plat Nomor Kendaraan <span className="text-danger">*</span>
              </Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="plat"
                  value={platInput}
                  onChange={(e) => {
                    setPlatInput(e.target.value.toUpperCase());
                    if (statusPlat !== "idle") setStatusPlat("idle");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      periksaPlat();
                    }
                  }}
                  placeholder="Contoh: B 1234 ABC"
                  className="font-semibold uppercase tracking-wider"
                  disabled={statusPlat === "ditemukan"}
                />
                {statusPlat === "ditemukan" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStatusPlat("idle");
                      setKendaraanDitemukan(null);
                    }}
                  >
                    Ganti Plat
                  </Button>
                ) : (
                  <Button type="button" onClick={periksaPlat} disabled={sedangCariPlat || !platInput.trim()}>
                    {sedangCariPlat ? <Loader2 className="size-4 animate-spin" /> : <Search />}
                    Periksa
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Kondisi 1: Plat Ditemukan */}
          {statusPlat === "ditemukan" && kendaraanDitemukan && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-success font-medium text-sm">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" />
                  Kendaraan dan Pelanggan Terdaftar
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Kendaraan:</span>
                  <p className="font-semibold text-text">{kendaraanDitemukan.plat}</p>
                  <p className="text-muted-foreground">
                    {kendaraanDitemukan.merek_model} {kendaraanDitemukan.tahun ? `(${kendaraanDitemukan.tahun})` : ""} - {kendaraanDitemukan.warna || "-"} ({kendaraanDitemukan.transmisi || "-"})
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Pemilik:</span>
                  <p className="font-semibold text-text">{kendaraanDitemukan.customer.nama}</p>
                  <p className="text-muted-foreground">Telp: {kendaraanDitemukan.customer.telepon}</p>
                  {kendaraanDitemukan.customer.alamat && (
                    <p className="text-xs text-muted-foreground mt-0.5">{kendaraanDitemukan.customer.alamat}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Kondisi 2: Plat Belum Terdaftar */}
          {statusPlat === "belum_terdaftar" && (
            <div className="space-y-5 rounded-lg border border-warning/40 bg-warning/5 p-4">
              <div className="flex items-center gap-2 text-warning text-sm font-semibold">
                <AlertCircle className="size-4.5" />
                Plat belum terdaftar. Lengkapi data pelanggan dan kendaraan di bawah ini:
              </div>

              {/* Data Kendaraan Baru */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-sm font-medium text-text">Data Kendaraan Baru ({platInput}):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Merek dan Model *</Label>
                    <Input
                      value={kendaraanMerek}
                      onChange={(e) => setKendaraanMerek(e.target.value)}
                      placeholder="Contoh: Toyota Avanza"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tahun</Label>
                    <Input
                      type="number"
                      value={kendaraanTahun}
                      onChange={(e) => setKendaraanTahun(e.target.value ? Number(e.target.value) : "")}
                      placeholder="Contoh: 2020"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Warna</Label>
                    <Input
                      value={kendaraanWarna}
                      onChange={(e) => setKendaraanWarna(e.target.value)}
                      placeholder="Contoh: Hitam Metalik"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Transmisi</Label>
                    <select
                      value={kendaraanTransmisi}
                      onChange={(e) => setKendaraanTransmisi(e.target.value as "AT" | "MT")}
                      className="w-full h-9 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="MT">Manual (MT)</option>
                      <option value="AT">Automatic (AT)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pilihan Pelanggan Baru vs Pelanggan Lama */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-text">Kepemilikan Pelanggan:</h4>
                  <div className="inline-flex rounded-md bg-muted p-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setTipePelanggan("baru")}
                      className={`px-3 py-1 rounded transition-colors ${
                        tipePelanggan === "baru" ? "bg-card text-primary shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      Pelanggan Baru
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipePelanggan("lama")}
                      className={`px-3 py-1 rounded transition-colors ${
                        tipePelanggan === "lama" ? "bg-card text-primary shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      Pelanggan Lama
                    </button>
                  </div>
                </div>

                {tipePelanggan === "lama" ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Cari Berdasarkan Nomor Telepon:</Label>
                    <Input
                      value={cariTelepon}
                      onChange={(e) => cariPelangganByTelepon(e.target.value)}
                      placeholder="Ketik 3+ digit nomor telepon..."
                    />
                    {daftarPelangganLama.length > 0 && (
                      <div className="rounded-md border border-border bg-card p-2 space-y-1">
                        {daftarPelangganLama.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setPelangganLamaPilihan(p);
                              setCariTelepon(p.telepon);
                              setDaftarPelangganLama([]);
                            }}
                            className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center ${
                              pelangganLamaPilihan?.id === p.id ? "bg-primary-soft text-primary-strong" : "hover:bg-muted"
                            }`}
                          >
                            <span className="font-medium">{p.nama}</span>
                            <span className="text-xs text-muted-foreground">{p.telepon}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pelangganLamaPilihan && (
                      <div className="text-xs text-success flex items-center gap-1 mt-1 font-medium">
                        <CheckCircle2 className="size-3.5" />
                        Terpilih: {pelangganLamaPilihan.nama} ({pelangganLamaPilihan.telepon})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tipe Pelanggan</Label>
                      <select
                        value={pelangganTipe}
                        onChange={(e) => setPelangganTipe(e.target.value as "perorangan" | "perusahaan")}
                        className="w-full h-9 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="perorangan">Perorangan</option>
                        <option value="perusahaan">Perusahaan</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Nama Lengkap *</Label>
                      <Input
                        value={pelangganNama}
                        onChange={(e) => setPelangganNama(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nomor Telepon (10-14 digit) *</Label>
                      <Input
                        value={pelangganTelepon}
                        onChange={(e) => setPelangganTelepon(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="Contoh: 08123456789"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email (opsional)</Label>
                      <Input
                        type="email"
                        value={pelangganEmail}
                        onChange={(e) => setPelangganEmail(e.target.value)}
                        placeholder="budi@contoh.test"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Alamat (opsional)</Label>
                      <Input
                        value={pelangganAlamat}
                        onChange={(e) => setPelangganAlamat(e.target.value)}
                        placeholder="Alamat lengkap pelanggan"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. BAGIAN DATA MASUK WORK ORDER */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="size-5 text-primary" />
            Data Masuk Work Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="odometer" className="text-sm font-medium">
                Odometer (KM) <span className="text-danger">*</span>
              </Label>
              <Input
                id="odometer"
                type="number"
                min="0"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value ? Number(e.target.value) : "")}
                placeholder="Contoh: 45000"
                className="mt-1 tabular-nums font-medium"
              />
            </div>

            <div>
              <Label htmlFor="tim" className="text-sm font-medium">
                Tim Kepala Mekanik <span className="text-danger">*</span>
              </Label>
              <select
                id="tim"
                value={kepalaMekanikId}
                onChange={(e) => setKepalaMekanikId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {daftarTim.map((tim) => (
                  <option key={tim.id} value={tim.id}>
                    {tim.nama} ({tim.jumlahWoAktif} WO aktif)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="keluhan" className="text-sm font-medium">
              Keluhan Kendaraan <span className="text-danger">*</span>
            </Label>
            <Textarea
              id="keluhan"
              value={keluhan}
              onChange={(e) => setKeluhan(e.target.value)}
              placeholder="Deskripsikan keluhan pemilik atau pekerjaan yang diminta..."
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. DOKUMENTASI FOTO (STNK & KONDISI AWAL) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            Dokumentasi Foto Masuk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto STNK (1 Foto) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Foto STNK (Wajib 1 Foto) <span className="text-danger">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">Privat · Otomatis WebP</span>
            </div>

            {previewStnk ? (
              <div className="relative w-48 h-32 rounded-lg border overflow-hidden group">
                <img src={previewStnk} alt="Preview STNK" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setFileStnk(null);
                    setPreviewStnk(null);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white hover:bg-black"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full sm:w-64 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="size-6 text-muted-foreground mb-1" />
                <span className="text-xs font-medium text-text">Pilih Foto STNK</span>
                <span className="text-[11px] text-muted-foreground">JPG/PNG/WebP</span>
                <input type="file" accept="image/*" onChange={handlePilihStnk} className="hidden" />
              </label>
            )}
          </div>

          {/* Foto Kondisi Awal (1 - 6 Foto) */}
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Foto Kondisi Awal (1 sampai 6 Foto) <span className="text-danger">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {filesKondisiAwal.length} dari 6 foto terpilih
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {previewsKondisiAwal.map((src, index) => (
                <div key={index} className="relative aspect-video rounded-lg border overflow-hidden group">
                  <img src={src} alt={`Kondisi Awal ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => hapusFotoAwal(index)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white hover:bg-black"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}

              {filesKondisiAwal.length < 6 && (
                <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="size-5 text-muted-foreground mb-1" />
                  <span className="text-xs font-medium text-text">+ Foto Kondisi</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleTambahFotoAwal}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tombol Simpan & Status Proses */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs text-muted-foreground">
          Semua foto akan dikompresi otomatis (WebP 1600px & thumbnail 320px) sesuai PRD 11.4.
        </p>

        <Button
          type="button"
          size="lg"
          onClick={simpanWorkOrder}
          disabled={memproses}
          className="w-full sm:w-auto min-w-[180px]"
        >
          {memproses ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              {statusProses || "Menyimpan..."}
            </>
          ) : (
            "Simpan Work Order"
          )}
        </Button>
      </div>
    </div>
  );
}
