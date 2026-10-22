import type { Metadata } from "next";
import { ProjectsDashboard } from "@/components/dashboard/projects-dashboard";
import { AccessDeniedToast } from "@/components/shared/access-denied-toast";
import { PageHeader } from "@/components/shared/page-header";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProfileSummary, Project, ProjectProgress, ProjectWithMeta } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

const EMPTY_PROGRESS = { total_tasks: 0, done_tasks: 0, total_weight: 0, done_weight: 0, progress: 0 };

export default async function DashboardPage(props: { searchParams: Promise<{ acesso?: string }> }) {
  const searchParams = await props.searchParams;
  const profile = await requireProfile(["admin", "manager"]);
  const supabase = (await createClient());

  const [projectsRes, progressRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, owner:profiles!projects_created_by_fkey(id, full_name, email, avatar_url)")
      .order("created_at", { ascending: false })
      .returns<(Project & { owner: ProfileSummary | null })[]>(),
    supabase.rpc("get_projects_progress"),
  ]);

  if (projectsRes.error) throw new Error(projectsRes.error.message);

  const progressRows = (progressRes.data ?? []) as ProjectProgress[];
  const progressMap = new Map(progressRows.map((p) => [p.project_id, p]));
  const projects: ProjectWithMeta[] = (projectsRes.data ?? []).map((p) => ({
    ...p,
    progress: progressMap.get(p.id) ?? { project_id: p.id, ...EMPTY_PROGRESS },
  }));

  const description =
    profile.role === "member"
      ? "Projetos nos quais você possui tarefas atribuídas."
      : profile.role === "manager"
        ? "Projetos sob sua gestão."
        : "Visão geral de todos os projetos da organização.";

  return (
    <>
      <AccessDeniedToast show={searchParams.acesso === "negado"} />
      <PageHeader title="Dashboard de Projetos" description={description} />
      <ProjectsDashboard projects={projects} currentUser={{ id: profile.id, role: profile.role }} />
    </>
  );
}
