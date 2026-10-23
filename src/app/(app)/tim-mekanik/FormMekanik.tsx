"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

const skema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  kepala_mekanik_id: z.string().min(1),
  aktif: z.boolean(),
});
type DataMekanik = z.infer<typeof skema>;

type Mekanik = Pick<Tables<"mekanik">, "id" | "nama" | "aktif" | "kepala_mekanik_id">;

/**
 * Tambah (tanpa `mekanik`) atau ubah mekanik. `pilihanTim` hanya dikirim untuk Owner,
 * karena hanya Owner yang boleh memindahkan mekanik antartim (PRD 6.5).
 */
export function FormMekanik({
  kepalaId,
  mekanik,
  pilihanTim,
}: {
  kepalaId: string;
  mekanik?: Mekanik;
  pilihanTim?: { id: string; nama: string }[];
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const form = useForm<DataMekanik>({
    resolver: zodResolver(skema),
    defaultValues: {
      nama: mekanik?.nama ?? "",
      kepala_mekanik_id: mekanik?.kepala_mekanik_id ?? kepalaId,
      aktif: mekanik?.aktif ?? true,
    },
  });

  async function simpan(data: DataMekanik) {
    const supabase = createClient();
    const { error } = mekanik
      ? await supabase.from("mekanik").update(data).eq("id", mekanik.id)
      : await supabase
          .from("mekanik")
          .insert({ nama: data.nama, kepala_mekanik_id: data.kepala_mekanik_id });

    if (error) {
      toast.error("Mekanik gagal disimpan. Pastikan mekanik ini ada di timmu.");
      return;
    }
    toast.success(mekanik ? "Data mekanik diperbarui" : "Mekanik berhasil ditambahkan");
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
        {mekanik ? (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Ubah ${mekanik.nama}`}
            className="size-8 border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-primary/40"
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="gap-1.5 bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs"
          >
            <Plus className="size-3.5" />
            Mekanik
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#111116] border border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">
            {mekanik ? "Ubah Mekanik" : "Tambah Mekanik"}
          </DialogTitle>
        </DialogHeader>
        <form id="form-mekanik" onSubmit={form.handleSubmit(simpan)} noValidate>
          <FieldGroup className="gap-4">
            <Controller
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="nama-mekanik"
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Nama Mekanik *
                  </FieldLabel>
                  <Input
                    {...field}
                    id="nama-mekanik"
                    placeholder="Contoh: Budi Santoso"
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {pilihanTim && (
              <Controller
                name="kepala_mekanik_id"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel
                      htmlFor="tim"
                      className="text-zinc-300 text-xs font-medium"
                    >
                      Regu Tim
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="tim"
                        className="w-full border-zinc-800 bg-zinc-900 text-white text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111116] border-zinc-800 text-white">
                        {pilihanTim.map((t) => (
                          <SelectItem
                            key={t.id}
                            value={t.id}
                            className="focus:bg-zinc-800 focus:text-white"
                          >
                            Tim {t.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}

            {mekanik && (
              <Controller
                name="aktif"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                      <Checkbox
                        id="aktif"
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                        className="border-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="grid gap-0.5 leading-none">
                        <label
                          htmlFor="aktif"
                          className="text-xs font-medium text-white cursor-pointer select-none"
                        >
                          Mekanik Aktif
                        </label>
                        <p className="text-[11px] text-zinc-400">
                          Mekanik nonaktif tidak muncul sebagai pilihan saat penugasan Work Order.
                        </p>
                      </div>
                    </div>
                  </Field>
                )}
              />
            )}
          </FieldGroup>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="submit"
            form="form-mekanik"
            disabled={form.formState.isSubmitting}
            className="bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs"
          >
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Mekanik"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
