"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole, toErrorMessage } from "@/lib/auth";
import { PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, TaskPriority, TaskStatus } from "@/lib/types";

const taskSchema = z.object({
  project_id: z.string().uuid("Selecione um projeto."),
  title: z.string().trim().min(2, "Título deve ter ao menos 2 caracteres.").max(200),
  description: z.string().trim().max(5000).optional().transform((v) => v || null),
  status: z.enum(TASK_STATUSES.map((s) => s.value) as [TaskStatus, ...TaskStatus[]]),
  priority: z.enum(PRIORITIES as [TaskPriority, ...TaskPriority[]]),
  assignee_id: z.string().uuid().nullable().optional().transform((v) => v ?? null),
  weight: z.coerce.number().int().min(1, "Peso mínimo é 1.").max(100, "Peso máximo é 100."),
  due_date: z.string().optional().transform((v) => v || null),
});

export type TaskInput = z.input<typeof taskSchema>;

function revalidate() {
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  revalidatePath("/relatorios");
}

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : toErrorMessage(e) };
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  try {
    const profile = await assertRole(["admin", "manager"]);
    const data = taskSchema.parse(input);
    const { error } = await (await createClient())
      .from("tasks")
      .insert({ ...data, position: Date.now(), created_by: profile.id });
    if (error) throw error;
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  try {
    await assertRole(["admin", "manager"]);
    const data = taskSchema.parse(input);
    const { data: rows, error } = await (await createClient()).from("tasks").update(data).eq("id", id).select("id");
    if (error) throw error;
    if (!rows?.length) throw new Error("Você não tem permissão para editar esta tarefa.");
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    await assertRole(["admin", "manager"]);
    const { data: rows, error } = await (await createClient()).from("tasks").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!rows?.length) throw new Error("Você não tem permissão para excluir esta tarefa.");
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
