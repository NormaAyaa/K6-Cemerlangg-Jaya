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
  stok_fisik: z.number().int("Harus berupa angka bulat").min(0, "Stok tidak boleh minus"),
  alasan: z.string().trim().min(5, "Alasan penyesuaian minimal 5 karakter (wajib)"),
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

  const stokFisikInput = form.watch("stok_fisik");
  const selisih = (stokFisikInput ?? item.stok) - item.stok;

  async function simpan(data: DataForm) {
    if (data.stok_fisik === item.stok) {
      toast.info("Stok fisik sama dengan stok sistem, tidak ada perubahan");
      setBuka(false);
      return;
    }

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
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-zinc-800 bg-zinc-900/80 text-amber-400 hover:bg-zinc-800 hover:text-amber-300 hover:border-amber-500/40"
        >
          <Scale className="size-3.5" />
          Sesuaikan Stok
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#111116] border border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">
            Penyesuaian Stok Fisik (Opname)
          </DialogTitle>
        </DialogHeader>
        <div className="mb-2 space-y-1 rounded-lg bg-zinc-900/80 border border-zinc-800 p-3 text-sm">
          <p className="font-semibold text-white">{item.nama}</p>
          <p className="text-zinc-400 text-xs">
            Stok di sistem saat ini:{" "}
            <span className="font-mono font-bold text-white">{item.stok}</span>
          </p>
          {selisih !== 0 && (
            <p
              className={
                selisih > 0
                  ? "text-emerald-400 text-xs font-medium"
                  : "text-rose-400 text-xs font-medium"
              }
            >
              Selisih: {selisih > 0 ? `+${selisih}` : selisih} unit
            </p>
          )}
        </div>
        <form
          id={`form-sesuaikan-${item.id}`}
          onSubmit={form.handleSubmit(simpan)}
          noValidate
        >
          <FieldGroup className="gap-4">
            <Controller
              name="stok_fisik"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor={`fisik-${item.id}`}
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Stok Hasil Hitung Fisik *
                  </FieldLabel>
                  <Input
                    id={`fisik-${item.id}`}
                    type="number"
                    min={0}
                    value={field.value ?? 0}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? 0 : Number(e.target.value)
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
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
                  <FieldLabel
                    htmlFor={`alasan-${item.id}`}
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Alasan Penyesuaian (Wajib Diisi) *
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`alasan-${item.id}`}
                    rows={2}
                    placeholder="Contoh: Stok rusak saat pemindahan / hasil stok opname bulanan"
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs resize-none"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="submit"
            form={`form-sesuaikan-${item.id}`}
            disabled={form.formState.isSubmitting}
            className="bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs"
          >
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Penyesuaian"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
