"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole, toErrorMessage } from "@/lib/auth";
import { PROJECT_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ProjectStatus } from "@/lib/types";

const projectSchema = z
  .object({
    name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres.").max(120),
    description: z.string().trim().max(2000).optional().transform((v) => v || null),
    category: z.string().trim().max(60).optional().transform((v) => v || null),
    status: z.enum(PROJECT_STATUSES as [ProjectStatus, ...ProjectStatus[]]),
    start_date: z.string().optional().transform((v) => v || null),
    end_date: z.string().optional().transform((v) => v || null),
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: "A data de término deve ser posterior ao início.",
  });

export type ProjectInput = z.input<typeof projectSchema>;

function revalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/kanban");
  revalidatePath("/relatorios");
}

export async function createProject(input: ProjectInput): Promise<ActionResult> {
  try {
    const profile = await assertRole(["admin", "manager"]);
    const data = projectSchema.parse(input);
    const { error } = await (await createClient()).from("projects").insert({ ...data, created_by: profile.id });
    if (error) throw error;
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : toErrorMessage(e) };
  }
}

export async function updateProject(id: string, input: ProjectInput): Promise<ActionResult> {
  try {
    await assertRole(["admin", "manager"]);
    const data = projectSchema.parse(input);
    const { data: rows, error } = await (await createClient()).from("projects").update(data).eq("id", id).select("id");
    if (error) throw error;
    if (!rows?.length) throw new Error("Você não tem permissão para editar este projeto.");
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : toErrorMessage(e) };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    await assertRole(["admin", "manager"]);
    const { data: rows, error } = await (await createClient()).from("projects").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!rows?.length) throw new Error("Você não tem permissão para excluir este projeto.");
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toErrorMessage(e) };
  }
}
