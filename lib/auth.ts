import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { homePath } from "@/lib/rbac";
import type { Profile, UserRole } from "@/lib/types";

/** Perfil do usuário logado (memoizado por request). */
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const supabase = (await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return data ?? null;
});

/** Para páginas: redireciona se não autenticado / sem permissão. */
export async function requireProfile(roles?: UserRole[]): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile || !profile.is_active) redirect("/login");
  if (roles && !roles.includes(profile.role)) redirect(`${homePath(profile.role)}?acesso=negado`);
  return profile;
}

/** Para Server Actions: lança erro em vez de redirecionar. */
export async function assertRole(roles?: UserRole[]): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile || !profile.is_active) throw new Error("Sessão expirada. Faça login novamente.");
  if (roles && !roles.includes(profile.role)) throw new Error("Você não tem permissão para esta ação.");
  return profile;
}

export function toErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return "Erro inesperado.";
}
