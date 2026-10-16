import { redirect } from "next/navigation";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormSetelan } from "./FormSetelan";

export default async function HalamanSetelan() {
  const profil = await ambilProfilSaya();

  // Route guard: Hanya Owner yang boleh mengakses setelan bengkel (PRD 6.11)
  if (profil.peran !== "owner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: setelan } = await supabase
    .from("workshop_settings")
    .select("id, nama, alamat, telepon, jam_buka, logo_path, galeri_paths")
    .eq("id", 1)
    .single();

  const dataBengkel = setelan ?? {
    id: 1,
    nama: "Cemerlang Jaya Motor",
    alamat: "",
    telepon: "",
    jam_buka: null,
    logo_path: null,
    galeri_paths: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Setelan Bengkel</h1>
        <p className="text-sm text-text-muted">
          Atur identitas bengkel, logo usaha, dan foto galeri publik.
        </p>
      </div>

      <FormSetelan setelan={dataBengkel} />
    </div>
  );
}
