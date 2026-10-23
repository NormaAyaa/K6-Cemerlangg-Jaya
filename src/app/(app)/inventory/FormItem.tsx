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
import { createClient } from "@/lib/supabase/client";

const skema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  kode: z.string().trim().optional(),
  harga_jual: z.number().min(0, "Harga jual minimal 0"),
  stok_minimum: z.number().int().min(0, "Stok minimum minimal 0").optional(),
  harga_modal: z.number().min(0, "Harga modal minimal 0").optional().nullable(),
});
type DataForm = z.infer<typeof skema>;

export function FormItem({
  jenis,
  item,
  isOwner,
}: {
  jenis: "part" | "jasa";
  item?: {
    id: string;
    kode: string;
    jenis: string;
    nama: string;
    harga_jual: number;
    stok_minimum?: number;
    harga_modal?: number | null;
  };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const form = useForm<DataForm>({
    resolver: zodResolver(skema),
    defaultValues: {
      nama: item?.nama ?? "",
      kode: item?.kode ?? "",
      harga_jual: item?.harga_jual ?? 0,
      stok_minimum: item?.stok_minimum ?? (jenis === "part" ? 5 : 0),
      harga_modal: item?.harga_modal ?? null,
    },
  });

  async function simpan(data: DataForm) {
    const supabase = createClient();

    if (item) {
      // Ubah item
      const updateData: {
        nama: string;
        harga_jual: number;
        stok_minimum?: number;
      } = {
        nama: data.nama,
        harga_jual: data.harga_jual,
      };

      if (jenis === "part") {
        updateData.stok_minimum = data.stok_minimum ?? 5;
      }

      const { error: errUpdate } = await supabase
        .from("inventory_items")
        .update(updateData)
        .eq("id", item.id);

      if (errUpdate) {
        toast.error(errUpdate.message || "Gagal mengubah item");
        return;
      }

      // Khusus Owner: perbarui harga modal jika jenis part
      if (isOwner && jenis === "part" && data.harga_modal !== undefined && data.harga_modal !== null) {
        const { error: errModal } = await supabase
          .from("inventory_costs")
          .upsert({
            item_id: item.id,
            harga_modal: data.harga_modal,
          });

        if (errModal) {
          toast.error("Data tersimpan tetapi gagal memperbarui harga modal");
        }
      }

      toast.success(`${jenis === "part" ? "Spare part" : "Jasa"} berhasil diperbarui`);
    } else {
      // Tambah item baru
      const insertData = {
        jenis,
        nama: data.nama,
        harga_jual: data.harga_jual,
        kode: data.kode?.trim() || "",
        ...(jenis === "part" ? { stok_minimum: data.stok_minimum ?? 5 } : {}),
      };

      const { data: itemBaru, error: errInsert } = await supabase
        .from("inventory_items")
        .insert(insertData)
        .select("id")
        .single();

      if (errInsert || !itemBaru) {
        if (errInsert?.code === "23505") {
          form.setError("kode", { message: "Kode/SKU ini sudah digunakan" });
        } else {
          toast.error(errInsert?.message || "Gagal menambahkan item");
        }
        return;
      }

      // Khusus Owner: simpan harga modal jika jenis part
      if (isOwner && jenis === "part" && data.harga_modal !== undefined && data.harga_modal !== null) {
        const { error: errModal } = await supabase
          .from("inventory_costs")
          .insert({
            item_id: itemBaru.id,
            harga_modal: data.harga_modal,
          });

        if (errModal) {
          toast.error("Item berhasil dibuat tetapi harga modal gagal disimpan");
        }
      }

      toast.success(`${jenis === "part" ? "Spare part" : "Jasa"} berhasil ditambahkan`);
    }

    setBuka(false);
    form.reset();
    router.refresh();
  }

  const judul = item
    ? `Ubah ${jenis === "part" ? "Spare Part" : "Jasa"}`
    : `Tambah ${jenis === "part" ? "Spare Part" : "Jasa"}`;

  return (
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (!v) form.reset();
      }}
    >
      <DialogTrigger asChild>
        {item ? (
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
            {jenis === "part" ? "Spare Part" : "Jasa"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#111116] border border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">
            {judul}
          </DialogTitle>
        </DialogHeader>
        <form
          id={`form-item-${item?.id ?? "baru"}`}
          onSubmit={form.handleSubmit(simpan)}
          noValidate
        >
          <FieldGroup className="gap-4">
            <Controller
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="nama-item"
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Nama {jenis === "part" ? "Spare Part" : "Jasa"} *
                  </FieldLabel>
                  <Input
                    {...field}
                    id="nama-item"
                    placeholder={
                      jenis === "part" ? "Contoh: Filter Udara" : "Contoh: Tune-up"
                    }
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {!item && (
              <Controller
                name="kode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel
                      htmlFor="kode-item"
                      className="text-zinc-300 text-xs font-medium"
                    >
                      Kode / SKU (Opsional - otomatis dibuat bila kosong)
                    </FieldLabel>
                    <Input
                      {...field}
                      id="kode-item"
                      placeholder={jenis === "part" ? "SP-0011" : "JS-0007"}
                      aria-invalid={fieldState.invalid}
                      className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            )}

            <Controller
              name="harga_jual"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="harga-jual-item"
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Harga Jual (Rp) *
                  </FieldLabel>
                  <Input
                    id="harga-jual-item"
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

            {isOwner && jenis === "part" && (
              <Controller
                name="harga_modal"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel
                      htmlFor="harga-modal-item"
                      className="text-zinc-300 text-xs font-medium"
                    >
                      Harga Modal (Rp) - Khusus Owner
                    </FieldLabel>
                    <Input
                      id="harga-modal-item"
                      type="number"
                      min={0}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      placeholder="0"
                      aria-invalid={fieldState.invalid}
                      className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            )}

            {jenis === "part" && (
              <Controller
                name="stok_minimum"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel
                      htmlFor="stok-minimum-item"
                      className="text-zinc-300 text-xs font-medium"
                    >
                      Batas Stok Minimum (Peringatan Menipis)
                    </FieldLabel>
                    <Input
                      id="stok-minimum-item"
                      type="number"
                      min={0}
                      value={field.value ?? 5}
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
            )}
          </FieldGroup>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="submit"
            form={`form-item-${item?.id ?? "baru"}`}
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
