"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
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
import { PERAN, LABEL_PERAN, type Peran } from "@/lib/peran";

const skema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  role: z.enum(PERAN),
  aktif: z.boolean(),
});
type DataForm = z.infer<typeof skema>;

type ProfilUser = {
  id: string;
  nama: string;
  email: string;
  role: string;
  aktif: boolean;
};

export function FormPengguna({
  target,
  currentUserId,
}: {
  target: ProfilUser;
  currentUserId: string;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const form = useForm<DataForm>({
    resolver: zodResolver(skema),
    defaultValues: {
      nama: target.nama,
      role: (target.role as Peran) || "kepala_mekanik",
      aktif: target.aktif,
    },
  });

  const isSelf = target.id === currentUserId;

  async function simpan(data: DataForm) {
    const supabase = createClient();

    // Proteksi: jangan menonaktifkan diri sendiri
    if (isSelf && !data.aktif) {
      toast.error("Anda tidak dapat menonaktifkan akun Anda sendiri");
      return;
    }

    // Proteksi: jangan menurunkan peran diri sendiri dari owner
    if (isSelf && target.role === "owner" && data.role !== "owner") {
      toast.error("Anda tidak dapat mengubah peran Anda sendiri");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        nama: data.nama,
        role: data.role,
        aktif: data.aktif,
      })
      .eq("id", target.id);

    if (error) {
      toast.error(error.message || "Gagal memperbarui profil pengguna");
      return;
    }

    toast.success(`Akun ${data.nama} berhasil diperbarui`);
    setBuka(false);
    router.refresh();
  }

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-primary/40"
        >
          <Pencil className="size-3.5" />
          Ubah
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#111116] border border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold">
            Ubah Pengguna
          </DialogTitle>
        </DialogHeader>
        <form
          id={`form-pengguna-${target.id}`}
          onSubmit={form.handleSubmit(simpan)}
          noValidate
        >
          <FieldGroup className="gap-4">
            {/* Email (Read-only) */}
            <Field>
              <FieldLabel className="text-zinc-400 text-xs font-medium">Email</FieldLabel>
              <Input
                value={target.email}
                disabled
                className="border-zinc-800/80 bg-zinc-900/40 text-zinc-400 font-mono text-xs cursor-not-allowed opacity-80"
              />
            </Field>

            {/* Nama */}
            <Controller
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor={`nama-${target.id}`}
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Nama Lengkap *
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`nama-${target.id}`}
                    placeholder="Nama pengguna"
                    aria-invalid={fieldState.invalid}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 text-xs"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {/* Peran */}
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={`role-${target.id}`}
                    className="text-zinc-300 text-xs font-medium"
                  >
                    Peran *
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSelf && target.role === "owner"}
                  >
                    <SelectTrigger
                      id={`role-${target.id}`}
                      className="border-zinc-800 bg-zinc-900 text-white text-xs"
                    >
                      <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111116] border-zinc-800 text-white">
                      {PERAN.map((p) => (
                        <SelectItem key={p} value={p} className="focus:bg-zinc-800 focus:text-white">
                          {LABEL_PERAN[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSelf && target.role === "owner" && (
                    <p className="mt-1 text-[11px] text-zinc-500 italic">
                      Anda tidak dapat mengubah peran akun Anda sendiri.
                    </p>
                  )}
                </Field>
              )}
            />

            {/* Status Aktif */}
            <Controller
              name="aktif"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <Checkbox
                      id={`aktif-${target.id}`}
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      disabled={isSelf}
                      className="border-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="grid gap-0.5 leading-none">
                      <label
                        htmlFor={`aktif-${target.id}`}
                        className="text-xs font-medium text-white cursor-pointer select-none"
                      >
                        Akun Aktif
                      </label>
                      <p className="text-[11px] text-zinc-400">
                        {isSelf
                          ? "Anda tidak dapat menonaktifkan akun sendiri."
                          : "Jika dinonaktifkan, pengguna tidak dapat masuk ke sistem."}
                      </p>
                    </div>
                  </div>
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="submit"
            form={`form-pengguna-${target.id}`}
            disabled={form.formState.isSubmitting}
            className="bg-primary hover:bg-primary-strong text-white font-medium text-xs shadow-xs"
          >
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
