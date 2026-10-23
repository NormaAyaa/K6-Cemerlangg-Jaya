import { Suspense } from "react";
import { PesanDariUrl } from "@/components/PesanDariUrl";
import { Sidebar } from "@/components/Sidebar";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profil = await ambilProfilSaya();
  const supabase = await createClient();
  const { data: bengkel } = await supabase
    .from("workshop_settings")
    .select("nama, logo_path")
    .eq("id", 1)
    .maybeSingle();

  // Gunakan logo_path bila ada di bucket, atau fallback ke logo bengkel di /logo.png
  const logoUrl = bengkel?.logo_path
    ? supabase.storage.from("publik").getPublicUrl(bengkel.logo_path).data.publicUrl
    : "/logo.png?v=2";

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-[#09090d] text-zinc-100">
      <Sidebar
        namaBengkel={bengkel?.nama ?? "Cemerlang Jaya Motor"}
        logoUrl={logoUrl}
        nama={profil.nama}
        peran={profil.peran}
      />
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
      <Suspense>
        <PesanDariUrl />
      </Suspense>
    </div>
  );
}
