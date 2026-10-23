"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Stethoscope, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface Props {
  woId: string;
  statusSaatIni: string;
  keluhanAwal: string;
  odometerAwal: number;
  diagnosisAwal: string | null;
  kepalaMekanikIdAwal: string;
  peran: "owner" | "admin" | "kepala_mekanik";
  userId: string;
  daftarKepalaMekanik: Array<{ id: string; nama: string }>;
}

export function DialogUbahDataMasuk({
  woId,
  statusSaatIni,
  keluhanAwal,
  odometerAwal,
  diagnosisAwal,
  kepalaMekanikIdAwal,
  peran,
  userId,
  daftarKepalaMekanik,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const isOwner = peran === "owner";
  const isAdmin = peran === "admin";
  const isKmTim = peran === "kepala_mekanik" && kepalaMekanikIdAwal === userId;

  const bolehUbahDataMasuk = (isAdmin || isOwner) && statusSaatIni === "menunggu";
  const bolehUbahDiagnosis = (isKmTim || isOwner) && ["dikerjakan", "tertunda"].includes(statusSaatIni);

  // Dialog State
  const [bukaDataMasuk, setBukaDataMasuk] = useState(false);
  const [odometer, setOdometer] = useState(odometerAwal);
  const [keluhan, setKeluhan] = useState(keluhanAwal);
  const [timId, setTimId] = useState(kepalaMekanikIdAwal);

  const [bukaDiagnosis, setBukaDiagnosis] = useState(false);
  const [diagnosis, setDiagnosis] = useState(diagnosisAwal ?? "");

  const [loading, setLoading] = useState(false);

  async function simpanDataMasuk() {
    if (odometer < 0) {
      toast.error("Odometer tidak boleh negatif");
      return;
    }
    if (!keluhan.trim()) {
      toast.error("Keluhan wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          odometer: Number(odometer),
          keluhan: keluhan.trim(),
          kepala_mekanik_id: timId,
        })
        .eq("id", woId);

      if (error) throw new Error(error.message);

      toast.success("Data masuk Work Order berhasil diperbarui");
      setBukaDataMasuk(false);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui data masuk");
    } finally {
      setLoading(false);
    }
  }

  async function simpanDiagnosis() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          diagnosis: diagnosis.trim() || null,
        })
        .eq("id", woId);

      if (error) throw new Error(error.message);

      toast.success("Diagnosis pengerjaan berhasil disimpan");
      setBukaDiagnosis(false);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan diagnosis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Ubah Data Masuk (Keluhan, Odometer, Tim) saat status 'menunggu' */}
      {bolehUbahDataMasuk && (
        <Dialog open={bukaDataMasuk} onOpenChange={setBukaDataMasuk}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs gap-1.5"
            >
              <Pencil className="size-3.5 text-[#FF2E75]" />
              Ubah Data Masuk
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white font-semibold font-mono text-base">
                Ubah Data Masuk Work Order
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="odo-edit" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                  Odometer (KM) *
                </Label>
                <Input
                  id="odo-edit"
                  type="number"
                  min="0"
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                  className="bg-zinc-900/80 border-zinc-800 text-white font-mono focus-visible:border-[#FF2E75]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tim-edit" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                  Tim Kepala Mekanik *
                </Label>
                <select
                  id="tim-edit"
                  value={timId}
                  onChange={(e) => setTimId(e.target.value)}
                  className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-200 shadow-xs focus:border-[#FF2E75] focus:outline-none"
                >
                  {daftarKepalaMekanik.map((km) => (
                    <option key={km.id} value={km.id}>
                      {km.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="keluhan-edit" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                  Keluhan *
                </Label>
                <Textarea
                  id="keluhan-edit"
                  value={keluhan}
                  onChange={(e) => setKeluhan(e.target.value)}
                  rows={3}
                  className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-[#FF2E75]"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setBukaDataMasuk(false)}
                className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
              >
                Batal
              </Button>
              <Button
                onClick={simpanDataMasuk}
                disabled={loading}
                className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30"
              >
                {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Ubah / Isi Diagnosis saat status 'dikerjakan' atau 'tertunda' */}
      {bolehUbahDiagnosis && (
        <Dialog open={bukaDiagnosis} onOpenChange={setBukaDiagnosis}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs gap-1.5"
            >
              <Stethoscope className="size-3.5 text-[#FF2E75]" />
              {diagnosisAwal ? "Ubah Diagnosis" : "+ Isi Diagnosis"}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111116] border-zinc-800 text-zinc-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white font-semibold font-mono text-base">
                Diagnosis Hasil Pemeriksaan Mekanik
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="diag-input" className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
                Catatan Diagnosis Masalah
              </Label>
              <Textarea
                id="diag-input"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Tuliskan temuan diagnosis teknis mekanik (misal: kebocoran oli seal kruk as belakang)..."
                rows={4}
                className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-[#FF2E75]"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setBukaDiagnosis(false)}
                className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
              >
                Batal
              </Button>
              <Button
                onClick={simpanDiagnosis}
                disabled={loading}
                className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30"
              >
                {loading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                Simpan Diagnosis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
