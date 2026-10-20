"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Stethoscope, Users, Loader2 } from "lucide-react";
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
            <Button variant="outline" size="sm">
              <Pencil className="size-3.5" />
              Ubah Data Masuk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah Data Masuk Work Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="odo-edit">Odometer (KM) *</Label>
                <Input
                  id="odo-edit"
                  type="number"
                  min="0"
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                  className="mt-1 font-medium"
                />
              </div>

              <div>
                <Label htmlFor="tim-edit">Tim Kepala Mekanik *</Label>
                <select
                  id="tim-edit"
                  value={timId}
                  onChange={(e) => setTimId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {daftarKepalaMekanik.map((km) => (
                    <option key={km.id} value={km.id}>
                      {km.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="keluhan-edit">Keluhan *</Label>
                <Textarea
                  id="keluhan-edit"
                  value={keluhan}
                  onChange={(e) => setKeluhan(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBukaDataMasuk(false)}>
                Batal
              </Button>
              <Button onClick={simpanDataMasuk} disabled={loading}>
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
            <Button variant="outline" size="sm">
              <Stethoscope className="size-3.5" />
              {diagnosisAwal ? "Ubah Diagnosis" : "+ Isi Diagnosis"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Diagnosis Hasil Pemeriksaan Mekanik</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="diag-input">Catatan Diagnosis Masalah</Label>
              <Textarea
                id="diag-input"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Tuliskan temuan diagnosis teknis mekanik (misal: kebocoran oli seal kruk as belakang)..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBukaDiagnosis(false)}>
                Batal
              </Button>
              <Button onClick={simpanDiagnosis} disabled={loading}>
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
