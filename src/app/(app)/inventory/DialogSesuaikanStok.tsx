"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Scale } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

const skema = z.object({
  stok_fisik: z.number().int("Harus berupa angka bulat").min(0, "Stok fisik tidak boleh negatif"),
  alasan: z.string().trim().min(1, "Alasan penyesuaian stok wajib diisi"),
});
type DataForm = z.infer<typeof skema>;

export function DialogSesuaikanStok({
  item,
}: {
  item: { id: string; nama: string; stok: number };
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const form = useForm<DataForm>({
    resolver: zodResolver(skema),
    defaultValues: {
      stok_fisik: item.stok,
      alasan: "",
    },
  });

  const nilaiFisik = form.watch("stok_fisik");
  const selisih = (Number(nilaiFisik) || 0) - item.stok;

  async function simpan(data: DataForm) {
    const supabase = createClient();
    const { error } = await supabase.rpc("sesuaikan_stok", {
      p_item: item.id,
      p_stok_fisik: data.stok_fisik,
      p_alasan: data.alasan,
    });

    if (error) {
      toast.error(error.message || "Gagal menyesuaikan stok");
      return;
    }

    toast.success(`Stok ${item.nama} berhasil disesuaikan menjadi ${data.stok_fisik}`);
    setBuka(false);
    form.reset({ stok_fisik: data.stok_fisik, alasan: "" });
    router.refresh();
  }

  return (
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (!v) form.reset({ stok_fisik: item.stok, alasan: "" });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-amber-700 hover:text-amber-800">
          <Scale className="size-3.5" />
          Sesuaikan Stok
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok Fisik (Opname)</DialogTitle>
        </DialogHeader>
        <div className="mb-2 space-y-1 rounded-lg bg-bg-app p-3 text-sm">
          <p className="font-medium text-text">{item.nama}</p>
          <p className="text-text-muted">
            Stok di sistem saat ini: <span className="font-semibold text-text">{item.stok}</span>
          </p>
          {selisih !== 0 && (
            <p className={selisih > 0 ? "text-emerald-600 text-xs font-medium" : "text-rose-600 text-xs font-medium"}>
              Selisih: {selisih > 0 ? `+${selisih}` : selisih} unit
            </p>
          )}
        </div>
        <form id={`form-sesuaikan-${item.id}`} onSubmit={form.handleSubmit(simpan)} noValidate>
          <FieldGroup className="gap-4">
            <Controller
              name="stok_fisik"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`fisik-${item.id}`}>Stok Hasil Hitung Fisik *</FieldLabel>
                  <Input
                    id={`fisik-${item.id}`}
                    type="number"
                    min={0}
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="alasan"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`alasan-${item.id}`}>Alasan Penyesuaian *</FieldLabel>
                  <Textarea
                    {...field}
                    id={`alasan-${item.id}`}
                    rows={2}
                    placeholder="Contoh: Stok opname bulanan, barang rusak, salah hitung"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form={`form-sesuaikan-${item.id}`}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Penyesuaian"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
