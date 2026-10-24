import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormSetelan } from "./FormSetelan";
import { PaymentGatewaySetelan } from "./PaymentGatewaySetelan";

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

  // Cek ketersediaan env di server tanpa menampilkan nilainya
  const hasMayarApiKey = Boolean(process.env.MAYAR_API_KEY?.trim());
  const hasSupabaseSecretKey = Boolean(process.env.SUPABASE_SECRET_KEY?.trim());
  const terhubung = hasMayarApiKey && hasSupabaseSecretKey;
  const baseUrl = process.env.MAYAR_BASE_URL?.trim() || "https://api.mayar.io/hl/v2";
  const mode = "Sandbox";

  // Ambil host dari header request di server (otomatis menampilkan domain Netlify saat di Netlify)
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const webhookUrl = `${proto}://${host}/api/webhook/mayar`;

  // Ambil 10 baris terakhir log webhook Mayar khusus Owner
  const { data: rawLogs } = await supabase
    .from("mayar_webhook_log")
    .select("id, event, mayar_invoice_id, status, alasan, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const webhookLogs = rawLogs ?? [];

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Setelan Bengkel
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Atur identitas bengkel, logo usaha, foto galeri publik, dan integrasi payment gateway
          </p>
        </div>
      </div>

      <FormSetelan setelan={dataBengkel} />

      {/* Bagian Payment Gateway Khusus Owner */}
      <PaymentGatewaySetelan
        terhubung={terhubung}
        hasMayarApiKey={hasMayarApiKey}
        hasSupabaseSecretKey={hasSupabaseSecretKey}
        mode={mode}
        baseUrl={baseUrl}
        webhookUrl={webhookUrl}
        logs={webhookLogs}
      />
    </div>
  );
}
