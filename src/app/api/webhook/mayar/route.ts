import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface MayarInvoiceDetailResponse {
  statusCode?: number;
  messages?: string;
  message?: string;
  data?: {
    id?: string;
    amount?: number;
    status?: string;
    transactions?: Array<{
      id?: string;
      extraData?: Record<string, unknown> | null;
    }>;
  };
}

export async function POST(request: NextRequest) {
  // 1. Inisialisasi Supabase khusus server-side dengan secret key (tanpa NEXT_PUBLIC_)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || "";

  // Baca payload dari Mayar
  let body: Record<string, any> | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  // Jika payload kosong
  if (!body || typeof body !== "object") {
    if (supabaseUrl && supabaseSecretKey) {
      const supabase = createClient<Database>(supabaseUrl, supabaseSecretKey, {
        auth: { persistSession: false },
      });
      await supabase.from("mayar_webhook_log").insert({
        event: "unknown",
        mayar_invoice_id: null,
        payload: {},
        status: "ditolak",
        alasan: "Body permintaan webhook tidak berupa JSON yang valid",
      });
    }
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  // Nama event dari Mayar (misal: payment.received)
  const eventName =
    body.event || body.type || body["event.received"] || "unknown";

  // Ambil ID Invoice Mayar dan extraData
  // Sesuai dokumentasi Mayar API V2, ID invoice berada di data.productId / paymentLinkId / data.id
  const dataObj = body.data || {};
  const extraData = dataObj.extraData || body.extraData || {};

  const mayarInvoiceId: string | null =
    (extraData.mayar_invoice_id as string) ||
    (dataObj.productId as string) ||
    (dataObj.paymentLinkId as string) ||
    (body.paymentLinkId as string) ||
    (dataObj.id as string) ||
    null;

  const internalInvoiceId: string | null =
    (extraData.invoice_id as string) || null;

  // Jika SUPABASE_SECRET_KEY belum disetel di lingkungan server
  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("SUPABASE_SECRET_KEY belum dikonfigurasi di server");
    return NextResponse.json(
      { received: true, status: "ditolak", catatan: "Kredensial server belum lengkap" },
      { status: 200 },
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false },
  });

  // Fungsi helper untuk mencatat log ke mayar_webhook_log
  const catatLog = async (
    status: "diterima" | "ditolak",
    alasan: string,
  ) => {
    try {
      await supabase.from("mayar_webhook_log").insert({
        event: eventName,
        mayar_invoice_id: mayarInvoiceId,
        payload: body,
        status,
        alasan,
      });
    } catch (logErr) {
      console.error("Gagal mencatat mayar_webhook_log:", logErr);
    }
  };

  // Tangani event selain payment.received (misal: webhook uji dari Mayar, payment.reminder, dll.)
  if (eventName !== "payment.received") {
    await catatLog(
      "diterima",
      `Event '${eventName}' diterima dan dicatat (diabaikan karena bukan event pembayaran sukses)`,
    );
    return NextResponse.json(
      { received: true, event: eventName, catatan: "Event non-pembayaran berhasil dicatat" },
      { status: 200 },
    );
  }

  // Validasi ID invoice dari webhook
  if (!mayarInvoiceId) {
    await catatLog(
      "ditolak",
      "Tidak dapat menemukan ID invoice Mayar pada payload webhook",
    );
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  // 2. Jangan percaya isi pesan: Tanya ulang detail invoice langsung ke Mayar API V2
  const mayarApiKey = process.env.MAYAR_API_KEY;
  const mayarBaseUrl = (
    process.env.MAYAR_BASE_URL || "https://api.mayar.io/hl/v2"
  ).replace(/\/+$/, "");

  if (!mayarApiKey) {
    await catatLog(
      "ditolak",
      "MAYAR_API_KEY belum dikonfigurasi pada environment server",
    );
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  let mayarDetail: MayarInvoiceDetailResponse | null = null;
  try {
    const detailRes = await fetch(`${mayarBaseUrl}/invoices/${mayarInvoiceId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${mayarApiKey}`,
      },
      signal: AbortSignal.timeout(10000), // Batas waktu 10 detik
    });

    if (!detailRes.ok) {
      await catatLog(
        "ditolak",
        `Verifikasi ke Mayar gagal: server Mayar mengembalikan HTTP ${detailRes.status}`,
      );
      return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
    }

    mayarDetail = (await detailRes.json()) as MayarInvoiceDetailResponse;
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : "Kesalahan koneksi";
    await catatLog(
      "ditolak",
      `Gagal menghubungi API Mayar untuk verifikasi invoice: ${errMessage}`,
    );
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  const detailData = mayarDetail?.data;
  if (!detailData) {
    await catatLog(
      "ditolak",
      "Respon detail invoice dari Mayar tidak memuat data yang valid",
    );
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  // 3. Periksa status pembayaran dari Mayar
  if (detailData.status !== "paid") {
    await catatLog(
      "ditolak",
      `Invoice Mayar belum lunas (status saat ini: ${detailData.status || "tidak diketahui"})`,
    );
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  // Cari data tagihan terkait di database internal invoices
  let query = supabase
    .from("invoices")
    .select("id, nomor, mayar_invoice_id, mayar_jumlah, total, terbayar, status_bayar");

  if (internalInvoiceId) {
    query = query.or(
      `id.eq.${internalInvoiceId},mayar_invoice_id.eq.${mayarInvoiceId}`,
    );
  } else {
    query = query.eq("mayar_invoice_id", mayarInvoiceId);
  }

  const { data: invoice, error: invoiceErr } = await query.maybeSingle();

  if (invoiceErr || !invoice) {
    await catatLog(
      "ditolak",
      `Tagihan dengan ID Mayar ${mayarInvoiceId} tidak ditemukan di database invoices`,
    );
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  // Periksa kesesuaian jumlah nominal yang dibayar dengan mayar_jumlah di invoice kita
  const nominalMayarDetail = Number(detailData.amount);
  const nominalTersimpan = Number(invoice.mayar_jumlah);

  if (nominalMayarDetail !== nominalTersimpan) {
    await catatLog(
      "ditolak",
      `Jumlah pembayaran tidak sesuai (Mayar: Rp${nominalMayarDetail.toLocaleString(
        "id-ID",
      )}, Database: Rp${nominalTersimpan.toLocaleString("id-ID")})`,
    );
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  // Jika invoice sudah lunas sebelumnya (idempoten)
  if (invoice.status_bayar === "lunas") {
    await catatLog(
      "diterima",
      "Invoice sudah berstatus lunas sebelumnya (permintaan webhook berulang/idempoten)",
    );
    return NextResponse.json({ received: true, status: "diterima" }, { status: 200 });
  }

  // Panggil fungsi database tandai_lunas_mayar (dieksekusi menggunakan service_role / secret key)
  const { error: rpcErr } = await supabase.rpc("tandai_lunas_mayar", {
    p_mayar_invoice_id: mayarInvoiceId,
    p_invoice_id: invoice.id,
  });

  if (rpcErr) {
    await catatLog(
      "ditolak",
      `Gagal menandai lunas invoice di database: ${rpcErr.message}`,
    );
    return NextResponse.json({ received: true, status: "ditolak" }, { status: 200 });
  }

  // Sukses: catat log diterima
  await catatLog(
    "diterima",
    `Pembayaran Rp${nominalMayarDetail.toLocaleString(
      "id-ID",
    )} berhasil diverifikasi. Invoice #${invoice.nomor} telah ditandai lunas.`,
  );

  // 5. Selalu balas HTTP 200 dengan cepat
  return NextResponse.json(
    {
      received: true,
      status: "diterima",
      invoice: invoice.nomor,
    },
    { status: 200 },
  );
}
