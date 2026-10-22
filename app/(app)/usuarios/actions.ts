"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole, toErrorMessage } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, UserRole } from "@/lib/types";

const roleSchema = z.enum(ROLES as [UserRole, ...UserRole[]]);

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  full_name: z.string().trim().min(2, "Informe o nome completo."),
  password: z.string().min(8, "A senha provisória deve ter ao menos 8 caracteres."),
  role: roleSchema,
  department: z.string().trim().max(80).optional().transform((v) => v || null),
});

export type CreateUserInput = z.input<typeof createUserSchema>;

const BAN_FOREVER = "876000h"; // ~100 anos

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : toErrorMessage(e) };
}

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  try {
    await assertRole(["admin"]);
    const data = createUserSchema.parse(input);
    const admin = createAdminClient();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, department: data.department },
    });
    if (error) throw error;

    // O trigger cria o profile como 'member'; aplicamos o cargo escolhido.
    const { error: profileError } = await admin
      .from("profiles")
      .update({ role: data.role, full_name: data.full_name, department: data.department })
      .eq("id", created.user.id);
    if (profileError) throw profileError;

    revalidatePath("/usuarios");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  try {
    const me = await assertRole(["admin"]);
    if (userId === me.id) throw new Error("Você não pode alterar o seu próprio nível de acesso.");
    const parsedRole = roleSchema.parse(role);

    const { error } = await createClient().from("profiles").update({ role: parsedRole }).eq("id", userId);
    if (error) throw error;

    revalidatePath("/usuarios");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserDepartment(userId: string, department: string): Promise<ActionResult> {
  try {
    await assertRole(["admin"]);
    const { error } = await createClient()
      .from("profiles")
      .update({ department: department.trim() || null })
      .eq("id", userId);
    if (error) throw error;
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  try {
    const me = await assertRole(["admin"]);
    if (userId === me.id) throw new Error("Você não pode desativar a sua própria conta.");

    // 1) Bloqueia/desbloqueia login no Supabase Auth
    const { error: authError } = await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : BAN_FOREVER,
    });
    if (authError) throw authError;

    // 2) Reflete no profile (middleware e RLS verificam is_active)
    const { error } = await createClient().from("profiles").update({ is_active: active }).eq("id", userId);
    if (error) throw error;

    revalidatePath("/usuarios");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function sendPasswordReset(email: string): Promise<ActionResult> {
  try {
    await assertRole(["admin"]);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await createAdminClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=/atualizar-senha`,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
