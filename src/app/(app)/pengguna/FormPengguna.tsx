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
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (!v) {
          form.reset({
            nama: target.nama,
            role: (target.role as Peran) || "kepala_mekanik",
            aktif: target.aktif,
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Pencil className="size-3.5" />
          Kelola
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kelola Akun Pengguna</DialogTitle>
        </DialogHeader>
        <div className="mb-2 rounded-lg bg-bg-app p-3 text-xs text-text-muted">
          <p className="font-mono text-text">{target.email}</p>
        </div>
        <form id={`form-pengguna-${target.id}`} onSubmit={form.handleSubmit(simpan)} noValidate>
          <FieldGroup className="gap-4">
            <Controller
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`nama-${target.id}`}>Nama Lengkap *</FieldLabel>
                  <Input {...field} id={`nama-${target.id}`} aria-invalid={fieldState.invalid} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={`role-${target.id}`}>Peran Akun *</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSelf && target.role === "owner"}
                  >
                    <SelectTrigger id={`role-${target.id}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">{LABEL_PERAN.owner}</SelectItem>
                      <SelectItem value="admin">{LABEL_PERAN.admin}</SelectItem>
                      <SelectItem value="kepala_mekanik">{LABEL_PERAN.kepala_mekanik}</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSelf && target.role === "owner" && (
                    <p className="text-xs text-text-muted mt-1">Peran akun Anda sendiri terkunci sebagai Owner.</p>
                  )}
                </Field>
              )}
            />

            <Controller
              name="aktif"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center gap-3 pt-2">
                  <Checkbox
                    id={`aktif-${target.id}`}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    disabled={isSelf}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label
                      htmlFor={`aktif-${target.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-text"
                    >
                      Status Akun Aktif
                    </label>
                    <p className="text-xs text-text-muted">
                      Akun nonaktif tidak dapat masuk ke dalam sistem.
                    </p>
                  </div>
                </div>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form={`form-pengguna-${target.id}`}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
