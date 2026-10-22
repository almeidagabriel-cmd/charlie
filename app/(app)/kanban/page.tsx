import type { Metadata } from "next";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { PageHeader } from "@/components/shared/page-header";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProfileSummary, ProjectRef, TaskWithRelations } from "@/lib/types";

export const metadata: Metadata = { title: "Quadro Kanban" };

const TASK_SELECT =
  "*, project:projects(id, name, created_by), assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url)";

export default async function KanbanPage({ searchParams }: { searchParams: { project?: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();

  const [projectsRes, tasksRes, profilesRes] = await Promise.all([
    supabase.from("projects").select("id, name, created_by").order("name").returns<ProjectRef[]>(),
    supabase.from("tasks").select(TASK_SELECT).order("position").returns<TaskWithRelations[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("is_active", true)
      .order("full_name")
      .returns<ProfileSummary[]>(),
  ]);

  if (tasksRes.error) throw new Error(tasksRes.error.message);

  return (
    <>
      <PageHeader
        title="Quadro Kanban"
        description={
          profile.role === "member"
            ? "Suas tarefas. Arraste os cards para atualizar o status."
            : "Arraste os cards entre as colunas — as mudanças são salvas e sincronizadas em tempo real."
        }
      />
      <KanbanBoard
        initialTasks={tasksRes.data ?? []}
        projects={projectsRes.data ?? []}
        profiles={profilesRes.data ?? []}
        currentUser={{ id: profile.id, role: profile.role }}
        initialProjectId={searchParams.project}
      />
    </>
  );
}
