"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { login, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      Entrar
    </Button>
  );
}

export function LoginForm({ redirectTo, initialError }: { redirectTo?: string; initialError?: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(login, { error: initialError });
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Informe seu e-mail no campo acima.");
      return;
    }
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/atualizar-senha`,
    });
    setSending(false);
    if (error) toast.error("Não foi possível enviar o e-mail", { description: error.message });
    else toast.success("Se o e-mail existir, você receberá um link para redefinir a senha.");
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={sending}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
          >
            <Mail className="h-3 w-3" /> Esqueci minha senha
          </button>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
