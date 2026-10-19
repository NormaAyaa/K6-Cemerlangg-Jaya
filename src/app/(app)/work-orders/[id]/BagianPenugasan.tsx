"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Calendar, Play, Loader2, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tanggal } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

interface MekanikItem {
  id: string;
  nama: string;
  jumlahWoAktif: number;
}

interface Props {
  woId: string;
  statusSaatIni: string;
  peran: "owner" | "admin" | "kepala_mekanik";
  userId: string;
  kepalaMekanikId: string;
  namaKepalaMekanik: string;
  mekanikDitugaskan: Array<{ id: string; nama: string }>;
  estimasiSelesai: string | null;
  daftarMekanikTim: MekanikItem[];
}

export function BagianPenugasan({
  woId,
  statusSaatIni,
  peran,
  userId,
  kepalaMekanikId,
  namaKepalaMekanik,
  mekanikDitugaskan,
  estimasiSelesai,
  daftarMekanikTim,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const isOwner = peran === "owner";
  const isKmTim = peran === "kepala_mekanik" && kepalaMekanikId === userId;
  const bolehTugaskan = (isKmTim || isOwner) && statusSaatIni === "menunggu";

  const hariIni = new Date().toISOString().split("T")[0];

  const [mekanikTerpilih, setMekanikTerpilih] = useState<string[]>(
    mekanikDitugaskan.map((m) => m.id)
  );
  const [estimasi, setEstimasi] = useState(estimasiSelesai ?? "");
  const [loading, setLoading] = useState(false);

  function toggleMekanik(id: string) {
    if (mekanikTerpilih.includes(id)) {
      setMekanikTerpilih(mekanikTerpilih.filter((m) => m !== id));
    } else {
      if (mekanikTerpilih.length >= 3) {
        toast.error("Maksimal 3 mekanik yang dapat ditugaskan");
        return;
      }
      setMekanikTerpilih([...mekanikTerpilih, id]);
    }
  }

  async function handleTugaskanDanMulai() {
    if (mekanikTerpilih.length === 0) {
      toast.error("Minimal 1 mekanik harus dipilih");
      return;
    }

    if (!estimasi) {
      toast.error("Estimasi tanggal selesai wajib diisi");
      return;
    }

    if (estimasi < hariIni) {
      toast.error("Estimasi tanggal selesai tidak boleh sebelum hari ini");
      return;
    }

    setLoading(true);

    try {
      // 1. Panggil tugaskan_mekanik
      const { error: errTugas } = await supabase.rpc("tugaskan_mekanik", {
        p_wo: woId,
        p_mekanik: mekanikTerpilih,
        p_estimasi: estimasi,
      });

      if (errTugas) throw new Error(errTugas.message);

      // 2. Ubah status ke dikerjakan
      const { error: errStatus } = await supabase.rpc("ubah_status_wo", {
        p_wo: woId,
        p_status: "dikerjakan",
      });

      if (errStatus) throw new Error(errStatus.message);

      toast.success("Mekanik berhasil ditugaskan dan pengerjaan dimulai!");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Gagal melakukan penugasan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wrench className="size-5 text-primary" />
          Bagian B. Penugasan Tim & Mekanik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Tim Kepala Mekanik</dt>
            <dd className="mt-0.5 font-semibold text-text">{namaKepalaMekanik}</dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">Mekanik yang Ditugaskan</dt>
            <dd className="mt-0.5 font-medium text-text">
              {mekanikDitugaskan.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {mekanikDitugaskan.map((m) => (
                    <span
                      key={m.id}
                      className="px-2.5 py-0.5 bg-primary-soft text-primary-strong rounded-full text-xs font-semibold"
                    >
                      {m.nama}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">Belum ditugaskan</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">Estimasi Selesai</dt>
            <dd className="mt-0.5 font-semibold text-text">
              {estimasiSelesai ? tanggal(estimasiSelesai) : <span className="text-muted-foreground italic">Belum ditentukan</span>}
            </dd>
          </div>
        </div>

        {/* Form Penugasan jika status menunggu dan pengguna adalah KM tim / Owner */}
        {bolehTugaskan && (
          <div className="pt-4 border-t border-border space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 border border-border space-y-4">
              <h4 className="text-sm font-semibold text-text flex items-center gap-1.5">
                <CheckSquare className="size-4 text-primary" />
                Pilih Mekanik & Tentukan Estimasi Selesai
              </h4>

              {/* Daftar Mekanik Tim diurutkan dari beban paling ringan */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pilih 1 sampai 3 Mekanik dari Tim Anda:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {daftarMekanikTim.map((m, idx) => {
                    const terpilih = mekanikTerpilih.includes(m.id);
                    const disarankan = idx === 0 && m.jumlahWoAktif === 0;

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMekanik(m.id)}
                        className={`p-3 rounded-lg border text-sm flex items-center justify-between cursor-pointer transition-colors ${
                          terpilih
                            ? "border-primary bg-primary-soft/40 text-primary-strong font-medium"
                            : "border-border hover:bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={terpilih}
                            onChange={() => {}}
                            className="size-4 rounded text-primary"
                          />
                          <span>{m.nama}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {m.jumlahWoAktif} WO aktif {disarankan ? "★ disarankan" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Estimasi Tanggal Selesai */}
              <div className="max-w-xs space-y-1">
                <Label htmlFor="estimasi" className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Estimasi Selesai *
                </Label>
                <Input
                  id="estimasi"
                  type="date"
                  min={hariIni}
                  value={estimasi}
                  onChange={(e) => setEstimasi(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleTugaskanDanMulai} disabled={loading}>
                  {loading ? (
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                  ) : (
                    <Play className="size-4 mr-1.5" />
                  )}
                  Tugaskan & Mulai Kerjakan
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
