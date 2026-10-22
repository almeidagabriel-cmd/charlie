"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { createUser, type CreateUserInput } from "@/app/(app)/usuarios/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABEL, ROLES } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

const EMPTY: CreateUserInput = { email: "", full_name: "", password: "", role: "member", department: "" };

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [form, setForm] = useState<CreateUserInput>(EMPTY);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setForm({ ...EMPTY, password: generatePassword() });
  }, [open]);

  const set = <K extends keyof CreateUserInput>(k: K, v: CreateUserInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createUser(form);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Usuário criado.", {
        description: `Compartilhe a senha provisória com ${form.email} de forma segura.`,
      });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>A conta é criada já confirmada, com uma senha provisória.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u-name">Nome completo *</Label>
            <Input id="u-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-email">E-mail *</Label>
            <Input id="u-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nível de acesso</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-dept">Departamento</Label>
              <Input id="u-dept" value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-pass">Senha provisória *</Label>
            <div className="flex gap-2">
              <Input id="u-pass" value={form.password} onChange={(e) => set("password", e.target.value)} className="font-mono" required />
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Gerar nova senha" onClick={() => set("password", generatePassword())}>
                <Wand2 />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
