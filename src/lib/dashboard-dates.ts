/**
 * Helper perhitungan tanggal dan rentang periode untuk Dashboard (PRD Bab 12)
 * Menggunakan zona waktu Asia/Jakarta
 */

export type PilihanPeriode = "hari_ini" | "7_hari" | "30_hari" | "bulan_ini" | "kustom";

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dapatkanRentangPeriode(
  periode?: string,
  dariManual?: string,
  sampaiManual?: string
): {
  pDari: string;
  pSampai: string;
  kodePeriode: PilihanPeriode;
} {
  const sekarang = new Date();

  // Jika ada input manual khusus
  if (dariManual && sampaiManual && periode === "kustom") {
    return {
      pDari: dariManual,
      pSampai: sampaiManual,
      kodePeriode: "kustom",
    };
  }

  if (periode === "hari_ini") {
    const hariIni = formatYMD(sekarang);
    return { pDari: hariIni, pSampai: hariIni, kodePeriode: "hari_ini" };
  }

  if (periode === "7_hari") {
    const tujuhHariLalu = new Date(sekarang);
    tujuhHariLalu.setDate(sekarang.getDate() - 6);
    return {
      pDari: formatYMD(tujuhHariLalu),
      pSampai: formatYMD(sekarang),
      kodePeriode: "7_hari",
    };
  }

  if (periode === "30_hari") {
    const tigaPuluhHariLalu = new Date(sekarang);
    tigaPuluhHariLalu.setDate(sekarang.getDate() - 29);
    return {
      pDari: formatYMD(tigaPuluhHariLalu),
      pSampai: formatYMD(sekarang),
      kodePeriode: "30_hari",
    };
  }

  // Bawaan (Default): Bulan ini
  const y = sekarang.getFullYear();
  const m = sekarang.getMonth();
  const tglAwal = new Date(y, m, 1);
  const tglAkhir = new Date(y, m + 1, 0);

  return {
    pDari: formatYMD(tglAwal),
    pSampai: formatYMD(tglAkhir),
    kodePeriode: "bulan_ini",
  };
}
