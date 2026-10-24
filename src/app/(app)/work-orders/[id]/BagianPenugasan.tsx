"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Calendar, Play, Loader2, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Gagal melakukan penugasan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#111116] p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
        <Wrench className="size-5 text-[#FF2E75]" />
        <h2 className="text-base font-semibold text-white">Bagian B. Penugasan Tim & Mekanik</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <dt className="text-zinc-400 uppercase">Tim Kepala Mekanik</dt>
            <dd className="mt-1 font-semibold text-white text-sm">{namaKepalaMekanik}</dd>
          </div>

          <div>
            <dt className="text-zinc-400 uppercase">Mekanik yang Ditugaskan</dt>
            <dd className="mt-1 font-medium text-white">
              {mekanikDitugaskan.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {mekanikDitugaskan.map((m) => (
                    <span
                      key={m.id}
                      className="px-2.5 py-0.5 bg-[#FF2E75]/10 text-[#FF2E75] border border-[#FF2E75]/20 rounded-full text-[11px] font-semibold"
                    >
                      {m.nama}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-zinc-500 italic">Belum ditugaskan</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-zinc-400 uppercase">Estimasi Selesai</dt>
            <dd className="mt-1 font-semibold text-white">
              {estimasiSelesai ? tanggal(estimasiSelesai) : <span className="text-zinc-500 italic">Belum ditentukan</span>}
            </dd>
          </div>
        </div>

        {/* Form Penugasan jika status menunggu dan pengguna adalah KM tim / Owner */}
        {bolehTugaskan && (
          <div className="pt-4 border-t border-zinc-800/80 space-y-4">
            <div className="rounded-lg bg-zinc-900/60 p-4 border border-zinc-800 space-y-4 shadow-inner">
              <h4 className="text-xs font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="size-4 text-[#FF2E75]" />
                Pilih Mekanik & Tentukan Estimasi Selesai
              </h4>

              {/* Daftar Mekanik Tim diurutkan dari beban paling ringan */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400 font-mono">Pilih 1 sampai 3 Mekanik dari Tim Anda:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {daftarMekanikTim.map((m, idx) => {
                    const terpilih = mekanikTerpilih.includes(m.id);
                    const disarankan = idx === 0 && m.jumlahWoAktif === 0;

                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMekanik(m.id)}
                        className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-colors ${
                          terpilih
                            ? "border-[#FF2E75] bg-[#FF2E75]/10 text-[#FF2E75] font-semibold shadow-xs"
                            : "border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={terpilih}
                            onChange={() => {}}
                            className="size-4 rounded accent-[#FF2E75]"
                          />
                          <span>{m.nama}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          {m.jumlahWoAktif} WO aktif {disarankan ? "★ disarankan" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Estimasi Tanggal Selesai */}
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="estimasi" className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                  <Calendar className="size-3.5 text-[#FF2E75]" />
                  Estimasi Selesai *
                </Label>
                <Input
                  id="estimasi"
                  type="date"
                  min={hariIni}
                  value={estimasi}
                  onChange={(e) => setEstimasi(e.target.value)}
                  className="bg-zinc-900/80 border-zinc-800 text-white font-mono focus-visible:border-[#FF2E75]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleTugaskanDanMulai}
                  disabled={loading}
                  className="bg-primary hover:bg-primary-strong text-white font-medium shadow-md shadow-pink-950/30 text-xs"
                >
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
      </div>
    </div>
  );
}
