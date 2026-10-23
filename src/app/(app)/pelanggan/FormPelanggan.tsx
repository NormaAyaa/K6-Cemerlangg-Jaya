"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

// Aturan sama dengan check constraint di 01_dasar.sql, supaya pesan muncul sebelum ke server.
// Same rules as the check constraints in 01_dasar.sql, so errors show before reaching the server.
const skema = z.object({
  tipe: z.enum(["perorangan", "perusahaan"]),
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  telepon: z.string().trim().regex(/^[0-9]{10,14}$/, "Telepon berisi 10 sampai 14 digit angka"),
  email: z.union([z.literal(""), z.email("Format email tidak valid")]),
  alamat: z.string().trim(),
});
type DataPelanggan = z.infer<typeof skema>;

type Pelanggan = Pick<Tables<"customers">, "id" | "tipe" | "nama" | "telepon" | "email" | "alamat">;

/** Tanpa `pelanggan` = tambah baru; dengan `pelanggan` = ubah / Without `pelanggan` = create; with it = edit */
export function FormPelanggan({ pelanggan }: { pelanggan?: Pelanggan }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const form = useForm<DataPelanggan>({
    resolver: zodResolver(skema),
    defaultValues: {
      tipe: pelanggan?.tipe === "perusahaan" ? "perusahaan" : "perorangan",
      nama: pelanggan?.nama ?? "",
      telepon: pelanggan?.telepon ?? "",
      email: pelanggan?.email ?? "",
      alamat: pelanggan?.alamat ?? "",
    },
  });

  async function simpan(data: DataPelanggan) {
    const supabase = createClient();
    const baris = { ...data, email: data.email || null, alamat: data.alamat || null };

    const { data: hasil, error } = pelanggan
      ? await supabase.from("customers").update(baris).eq("id", pelanggan.id).select("id").single()
      : await supabase.from("customers").insert(baris).select("id").single();

    if (error) {
      // 23505 = unique violation pada kolom telepon / unique violation on the phone column
      if (error.code === "23505") form.setError("telepon", { message: "Telepon ini sudah terdaftar" });
      else toast.error("Pelanggan gagal disimpan. Periksa isian lalu coba lagi.");
      return;
    }

    toast.success(pelanggan ? "Data pelanggan diperbarui" : "Pelanggan ditambahkan");
    setBuka(false);
    // Pelanggan baru langsung dibuka agar kendaraannya bisa ditambahkan / Open the new customer so vehicles can be added right away
    if (pelanggan) router.refresh();
    else router.push(`/pelanggan/${hasil.id}`);
  }

  return (
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (!v) form.reset();
      }}
    >
      <DialogTrigger asChild>
        {pelanggan ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-primary/40"
          >
            <Pencil className="size-3.5" />
            Ubah
          </Button>
        ) : (
          <Button className="gap-2 bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs">
            <Plus className="size-4" />
            Pelanggan Baru
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#111116] border border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">
            {pelanggan ? "Ubah Data Pelanggan" : "Tambah Pelanggan Baru"}
          </DialogTitle>
        </DialogHeader>
        <form id="form-pelanggan" onSubmit={form.handleSubmit(simpan)} noValidate>
          <FieldGroup className="gap-4">
            <Controller
              name="tipe"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="tipe" className="text-zinc-300 text-xs font-medium">
                    Tipe Pelanggan *
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tipe" className="w-full border-zinc-800 bg-zinc-900 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-[#111116] text-white">
                      <SelectItem value="perorangan" className="text-xs focus:bg-zinc-800 focus:text-white">Perorangan</SelectItem>
                      <SelectItem value="perusahaan" className="text-xs focus:bg-zinc-800 focus:text-white">Perusahaan</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="nama" className="text-zinc-300 text-xs font-medium">
                    Nama Pelanggan *
                  </FieldLabel>
                  <Input
                    {...field}
                    id="nama"
                    placeholder="Contoh: Budi Santoso / PT Maju Jaya"
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="telepon"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="telepon" className="text-zinc-300 text-xs font-medium">
                    Nomor Telepon *
                  </FieldLabel>
                  <Input
                    {...field}
                    id="telepon"
                    inputMode="numeric"
                    placeholder="081234567890"
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs font-mono"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email" className="text-zinc-300 text-xs font-medium">
                    Alamat Email (Opsional)
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="pelanggan@email.com"
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="alamat"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="alamat" className="text-zinc-300 text-xs font-medium">
                    Alamat Domisili
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="alamat"
                    rows={2}
                    placeholder="Jalan, nomor, kelurahan, kota..."
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs resize-none"
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="submit"
            form="form-pelanggan"
            disabled={form.formState.isSubmitting}
            className="bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs"
          >
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
