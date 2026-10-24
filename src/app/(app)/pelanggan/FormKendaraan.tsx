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
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

const tahunMaks = new Date().getFullYear() + 1;

const skema = z.object({
  plat: z.string().trim().min(1, "Plat nomor wajib diisi"),
  merek_model: z.string().trim().min(1, "Merek dan model wajib diisi"),
  tahun: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1980 && Number(v) <= tahunMaks),
      `Tahun antara 1980 dan ${tahunMaks}`,
    ),
  warna: z.string().trim(),
  transmisi: z.enum(["AT", "MT"]).optional(),
});
type DataKendaraan = z.infer<typeof skema>;

type Kendaraan = Pick<Tables<"vehicles">, "id" | "plat" | "merek_model" | "tahun" | "warna" | "transmisi">;

// Sama dengan trigger rapikan_plat; dipakai untuk mencari pemilik plat yang bentrok.
// Mirrors the rapikan_plat trigger; used to look up the owner of a clashing plate.
const rapikanPlat = (plat: string) => plat.trim().replace(/\s+/g, " ").toUpperCase();

export function FormKendaraan({ customerId, kendaraan }: { customerId: string; kendaraan?: Kendaraan }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const form = useForm<DataKendaraan>({
    resolver: zodResolver(skema),
    defaultValues: {
      plat: kendaraan?.plat ?? "",
      merek_model: kendaraan?.merek_model ?? "",
      tahun: kendaraan?.tahun ? String(kendaraan.tahun) : "",
      warna: kendaraan?.warna ?? "",
      transmisi: kendaraan?.transmisi === "AT" || kendaraan?.transmisi === "MT" ? kendaraan.transmisi : undefined,
    },
  });

  async function simpan(data: DataKendaraan) {
    const supabase = createClient();
    const plat = rapikanPlat(data.plat);
    const baris = {
      customer_id: customerId,
      plat,
      merek_model: data.merek_model,
      tahun: data.tahun ? Number(data.tahun) : null,
      warna: data.warna || null,
      transmisi: data.transmisi ?? null,
    };

    const { error } = kendaraan
      ? await supabase.from("vehicles").update(baris).eq("id", kendaraan.id)
      : await supabase.from("vehicles").insert(baris);

    if (error) {
      if (error.code === "23505") {
        // Pesan PRD 6.3 menyebut nama pemilik plat / The PRD 6.3 message names the plate's owner
        const { data: pemilik } = await supabase
          .from("vehicles")
          .select("customers(nama)")
          .eq("plat", plat)
          .maybeSingle();
        const nama = pemilik?.customers?.nama;
        form.setError("plat", {
          message: nama ? `Plat ${plat} sudah terdaftar atas nama ${nama}` : `Plat ${plat} sudah terdaftar`,
        });
      } else {
        toast.error("Kendaraan gagal disimpan. Periksa isian lalu coba lagi.");
      }
      return;
    }

    toast.success(kendaraan ? "Data kendaraan diperbarui" : "Kendaraan ditambahkan");
    setBuka(false);
    form.reset();
    router.refresh();
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
        {kendaraan ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Ubah ${kendaraan.plat}`}
            className="size-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs">
            <Plus className="size-3.5" />
            Tambah Kendaraan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#111116] border border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">
            {kendaraan ? "Ubah Data Kendaraan" : "Tambah Kendaraan Baru"}
          </DialogTitle>
        </DialogHeader>
        <form id="form-kendaraan" onSubmit={form.handleSubmit(simpan)} noValidate>
          <FieldGroup className="gap-4">
            <Controller
              name="plat"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="plat" className="text-zinc-300 text-xs font-medium">
                    Plat Nomor *
                  </FieldLabel>
                  <Input
                    {...field}
                    id="plat"
                    placeholder="B 1234 ABC"
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs font-mono uppercase tracking-wider"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="merek_model"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="merek_model" className="text-zinc-300 text-xs font-medium">
                    Merek dan Model *
                  </FieldLabel>
                  <Input
                    {...field}
                    id="merek_model"
                    placeholder="Toyota Avanza 1.3 G"
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="tahun"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="tahun" className="text-zinc-300 text-xs font-medium">
                      Tahun Pembuatan
                    </FieldLabel>
                    <Input
                      {...field}
                      id="tahun"
                      inputMode="numeric"
                      placeholder="2020"
                      aria-invalid={fieldState.invalid}
                      className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs font-mono"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="warna"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="warna" className="text-zinc-300 text-xs font-medium">
                      Warna
                    </FieldLabel>
                    <Input
                      {...field}
                      id="warna"
                      placeholder="Hitam Metalik"
                      className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                    />
                  </Field>
                )}
              />
            </div>
            <Controller
              name="transmisi"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="transmisi" className="text-zinc-300 text-xs font-medium">
                    Transmisi
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="transmisi" className="w-full border-zinc-800 bg-zinc-900 text-white text-xs">
                      <SelectValue placeholder="Pilih jenis transmisi" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-[#111116] text-white">
                      <SelectItem value="AT" className="text-xs focus:bg-zinc-800 focus:text-white">AT (Otomatis)</SelectItem>
                      <SelectItem value="MT" className="text-xs focus:bg-zinc-800 focus:text-white">MT (Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="submit"
            form="form-kendaraan"
            disabled={form.formState.isSubmitting}
            className="bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs"
          >
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Kendaraan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
