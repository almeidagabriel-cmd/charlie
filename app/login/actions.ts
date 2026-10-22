"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  redirectTo: z.string().optional(),
});

function translateAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/banned/i.test(message)) return "Sua conta está desativada. Procure um administrador.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
  return message;
}

/** Aceita apenas caminhos internos (evita open redirect). */
function safePath(path: string | undefined) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: translateAuthError(error.message) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .single<{ is_active: boolean }>();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "Sua conta está desativada. Procure um administrador." };
  }

  revalidatePath("/", "layout");
  redirect(safePath(parsed.data.redirectTo));
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
