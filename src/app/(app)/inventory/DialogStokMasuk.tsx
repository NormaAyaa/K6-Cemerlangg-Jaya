"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDownToLine } from "lucide-react";
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
  jumlah: z.number().int("Harus berupa angka bulat").min(1, "Jumlah minimal 1"),
  keterangan: z.string().trim().optional(),
});
type DataForm = z.infer<typeof skema>;

export function DialogStokMasuk({
  item,
}: {
  item: { id: string; nama: string; stok: number };
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const form = useForm<DataForm>({
    resolver: zodResolver(skema),
    defaultValues: {
      jumlah: 1,
      keterangan: "",
    },
  });

  async function simpan(data: DataForm) {
    const supabase = createClient();
    const { error } = await supabase.rpc("catat_stok_masuk", {
      p_item: item.id,
      p_jumlah: data.jumlah,
      p_keterangan: data.keterangan || undefined,
    });

    if (error) {
      toast.error(error.message || "Gagal mencatat stok masuk");
      return;
    }

    toast.success(`Stok ${item.nama} berhasil ditambah ${data.jumlah}`);
    setBuka(false);
    form.reset({ jumlah: 1, keterangan: "" });
    router.refresh();
  }

  return (
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (!v) form.reset({ jumlah: 1, keterangan: "" });
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-emerald-500/40"
        >
          <ArrowDownToLine className="size-3.5 text-emerald-400" />
          Stok Masuk
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#111116] border border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">
            Catat Stok Masuk
          </DialogTitle>
        </DialogHeader>
        <div className="mb-2 rounded-lg bg-zinc-900/80 border border-zinc-800 p-3 text-sm">
          <p className="font-semibold text-white">{item.nama}</p>
          <p className="text-zinc-400 text-xs mt-0.5">
            Stok saat ini:{" "}
            <span className="font-mono font-bold text-white">{item.stok}</span>
          </p>
        </div>
        <form
          id={`form-stok-masuk-${item.id}`}
          onSubmit={form.handleSubmit(simpan)}
          noValidate
        >
          <FieldGroup className="gap-4">
            <Controller
              name="jumlah"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor={`jumlah-${item.id}`}
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Jumlah Masuk *
                  </FieldLabel>
                  <Input
                    id={`jumlah-${item.id}`}
                    type="number"
                    min={1}
                    value={field.value ?? 1}
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
              name="keterangan"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={`keterangan-${item.id}`}
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Keterangan (misal: Pembelian dari Toko X)
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`keterangan-${item.id}`}
                    rows={2}
                    placeholder="Catatan sumber stok atau nomor faktur beli"
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
            form={`form-stok-masuk-${item.id}`}
            disabled={form.formState.isSubmitting}
            className="bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs"
          >
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Stok Masuk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
