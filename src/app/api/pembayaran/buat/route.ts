import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface MayarCreateInvoiceResponse {
  statusCode?: number;
  messages?: string;
  message?: string;
  data?: {
    id?: string;
    link?: string;
    transactionId?: string;
    expiredAt?: number;
  };
}

export async function POST(request: NextRequest) {
  // 1. Otorisasi: Hanya Admin atau Owner yang sedang login
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sesi login tidak valid atau telah berakhir. Silakan login kembali." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, aktif")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Data profil pengguna tidak ditemukan" },
      { status: 403 },
    );
  }

  if (!profile.aktif) {
    return NextResponse.json(
      { error: "Akun Anda berstatus nonaktif" },
      { status: 403 },
    );
  }

  if (!["admin", "owner"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Hanya Admin atau Owner yang berhak membuat tautan pembayaran online" },
      { status: 403 },
    );
  }

  // 2. Baca parameter id invoice dari body permintaan
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format data permintaan tidak valid (harus berupa JSON)" },
      { status: 400 },
    );
  }

  const invoiceId = (body as { id?: string })?.id;
  if (!invoiceId || typeof invoiceId !== "string" || !invoiceId.trim()) {
    return NextResponse.json(
      { error: "ID invoice wajib diisi" },
      { status: 400 },
    );
  }

  // Ambil data invoice dari database
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, nomor, subtotal, diskon, total, terbayar, status_bayar, mayar_invoice_id, mayar_link, mayar_jumlah, work_order_id",
    )
    .eq("id", invoiceId.trim())
    .maybeSingle();

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { error: "Data invoice tidak ditemukan di database" },
      { status: 404 },
    );
  }

  const total = Number(invoice.total);
  const terbayar = Number(invoice.terbayar || 0);
  const sisa = total - terbayar;

  // Tolak bila invoice sudah lunas atau sisa tagihan <= 0
  if (invoice.status_bayar === "lunas" || sisa <= 0) {
    return NextResponse.json(
      { error: "Invoice sudah lunas, tidak dapat membuat tautan pembayaran baru" },
      { status: 400 },
    );
  }

  // 3. Bila invoice sudah punya mayar_link dan mayar_jumlah sama dengan sisa tagihan, kembalikan tautan itu
  if (
    invoice.mayar_link &&
    invoice.mayar_jumlah !== null &&
    Number(invoice.mayar_jumlah) === sisa
  ) {
    return NextResponse.json({
      link: invoice.mayar_link,
      invoiceId: invoice.id,
      mayarInvoiceId: invoice.mayar_invoice_id,
      jumlah: sisa,
      sudahAda: true,
    });
  }

  // Ambil data pelanggan dan rincian item tagihan dari database
  const { data: wo, error: woError } = await supabase
    .from("work_orders")
    .select(
      `
      id,
      customers (
        nama,
        email,
        telepon
      ),
      billing_items (
        nama_item,
        jumlah,
        harga_dipakai
      )
    `,
    )
    .eq("id", invoice.work_order_id)
    .maybeSingle();

  if (woError || !wo) {
    return NextResponse.json(
      { error: "Data Work Order terkait invoice ini tidak ditemukan" },
      { status: 404 },
    );
  }

  const customer = wo.customers;
  if (!customer) {
    return NextResponse.json(
      { error: "Data pelanggan untuk invoice ini tidak ditemukan" },
      { status: 404 },
    );
  }

  // Tolak bila email pelanggan kosong
  const email = customer.email?.trim();
  if (!email) {
    return NextResponse.json(
      {
        error:
          "Email pelanggan belum terdaftar. Pembayaran online Mayar membutuhkan alamat email pelanggan yang aktif.",
      },
      { status: 400 },
    );
  }

  const customerName = customer.nama?.trim() || "Pelanggan";
  const customerMobile =
    customer.telepon?.replace(/[^0-9+]/g, "").trim() || "081234567890";

  // Siapkan item tagihan sesuai ketentuan Mayar API V2
  const billingItems = wo.billing_items || [];
  const rawItems: Array<{ description: string; quantity: number; rate: number }> =
    billingItems.map((b) => ({
      description: b.nama_item || "Item Tagihan",
      quantity: Number(b.jumlah) || 1,
      rate: Number(b.harga_dipakai) || 0,
    }));

  if (Number(invoice.diskon || 0) > 0) {
    rawItems.push({
      description: "Diskon",
      quantity: 1,
      rate: -Number(invoice.diskon),
    });
  }

  if (terbayar > 0) {
    rawItems.push({
      description: "Pembayaran Sebelumnya",
      quantity: 1,
      rate: -terbayar,
    });
  }

  const calculatedSum = rawItems.reduce(
    (acc, it) => acc + it.quantity * it.rate,
    0,
  );

  const items =
    rawItems.length > 0 && calculatedSum === sisa
      ? rawItems
      : [
          {
            description: `Pelunasan Invoice #${invoice.nomor}`,
            quantity: 1,
            rate: sisa,
          },
        ];

  // 4. Konfigurasi kredensial Mayar dari environment
  const mayarApiKey = process.env.MAYAR_API_KEY;
  const mayarBaseUrl = (
    process.env.MAYAR_BASE_URL || "https://api.mayar.io/hl/v2"
  ).replace(/\/+$/, "");

  if (!mayarApiKey) {
    return NextResponse.json(
      {
        error:
          "Konfigurasi gerbang pembayaran belum lengkap (MAYAR_API_KEY belum disetel).",
      },
      { status: 500 },
    );
  }

  const mayarPayload = {
    name: customerName,
    email: email,
    mobile: customerMobile,
    description: `Pembayaran Invoice ${invoice.nomor}`,
    items: items,
    extraData: {
      invoice_id: invoice.id,
      invoice_nomor: invoice.nomor,
      work_order_id: wo.id,
    },
  };

  // 5. Permintaan ke Mayar API V2 dengan batas waktu (timeout) 10 detik
  let mayarResponse: Response;
  try {
    mayarResponse = await fetch(`${mayarBaseUrl}/invoices/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mayarApiKey}`,
      },
      body: JSON.stringify(mayarPayload),
      signal: AbortSignal.timeout(10000), // Batas waktu 10 detik
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      return NextResponse.json(
        {
          error:
            "Koneksi ke gateway pembayaran Mayar melebihi batas waktu 10 detik",
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        error:
          "Gagal menghubungi server pembayaran Mayar. Periksa koneksi internet.",
      },
      { status: 502 },
    );
  }

  let mayarJson: MayarCreateInvoiceResponse;
  try {
    mayarJson = (await mayarResponse.json()) as MayarCreateInvoiceResponse;
  } catch {
    return NextResponse.json(
      { error: "Respon dari server pembayaran tidak dapat diproses" },
      { status: 502 },
    );
  }

  if (!mayarResponse.ok || !mayarJson.data?.link || !mayarJson.data?.id) {
    const rawError =
      mayarJson.messages ||
      mayarJson.message ||
      "Permintaan pembuatan invoice Mayar ditolak";
    // Sensor bila kebetulan terdapat token/kunci pada pesan error
    const pesanAman = rawError.replaceAll(mayarApiKey, "[RAHASIA]");

    return NextResponse.json(
      { error: `Penyedia pembayaran menolak pembuatan invoice: ${pesanAman}` },
      {
        status:
          mayarResponse.status >= 400 && mayarResponse.status < 500 ? 400 : 502,
      },
    );
  }

  const mayarInvoiceId = mayarJson.data.id;
  const mayarLink = mayarJson.data.link;

  // Simpan data link Mayar ke database melalui fungsi simpan_link_mayar
  const { error: rpcError } = await supabase.rpc("simpan_link_mayar", {
    p_invoice_id: invoice.id,
    p_mayar_invoice_id: mayarInvoiceId,
    p_mayar_link: mayarLink,
    p_mayar_jumlah: sisa,
  });

  if (rpcError) {
    return NextResponse.json(
      {
        error: `Tautan berhasil dibuat tetapi gagal disimpan ke database: ${rpcError.message}`,
      },
      { status: 500 },
    );
  }

  // Kembalikan tautan pembayaran
  return NextResponse.json({
    link: mayarLink,
    invoiceId: invoice.id,
    mayarInvoiceId: mayarInvoiceId,
    jumlah: sisa,
    sudahAda: false,
  });
}
