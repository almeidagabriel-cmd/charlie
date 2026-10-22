"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);

    if (error) return toast.error("Não foi possível atualizar a senha", { description: error.message });
    toast.success("Senha atualizada com sucesso!");
    router.replace("/checklist");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar senha</Label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        Salvar senha
      </Button>
    </form>
  );
}
