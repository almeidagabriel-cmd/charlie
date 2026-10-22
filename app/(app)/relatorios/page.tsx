import type { Metadata } from "next";
import { format } from "date-fns";
import { MetricCards } from "@/components/reports/metric-cards";
import { ReportFilters } from "@/components/reports/report-filters";
import { TeamChart } from "@/components/reports/team-chart";
import { TeamTable } from "@/components/reports/team-table";
import { PageHeader } from "@/components/shared/page-header";
import { requireProfile } from "@/lib/auth";
import { computeReport, resolveRange, type ReportProfile, type ReportTask } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Relatórios" };

interface SearchParams {
  periodo?: string;
  de?: string;
  ate?: string;
  projeto?: string;
}

export default async function RelatoriosPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const range = resolveRange(searchParams.periodo, searchParams.de, searchParams.ate);
  const projectId = searchParams.projeto && searchParams.projeto !== "all" ? searchParams.projeto : undefined;

  // RLS já restringe: Admin → tudo; Gestor → seus projetos; Colaborador → suas tarefas.
  let tasksQuery = supabase
    .from("tasks")
    .select("id, project_id, status, assignee_id, weight, created_at, started_at, completed_at")
    .lte("created_at", range.to.toISOString());
  if (profile.role === "member") tasksQuery = tasksQuery.eq("assignee_id", profile.id);
  if (projectId) tasksQuery = tasksQuery.eq("project_id", projectId);

  const [tasksRes, projectsRes, profilesRes] = await Promise.all([
    tasksQuery.returns<ReportTask[]>(),
    supabase.from("projects").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
    supabase.from("profiles").select("id, full_name, email, role, department, avatar_url").returns<ReportProfile[]>(),
  ]);

  if (tasksRes.error) throw new Error(tasksRes.error.message);

  const report = computeReport(tasksRes.data ?? [], profilesRes.data ?? [], range);
  const isMember = profile.role === "member";

  return (
    <>
      <PageHeader
        title={isMember ? "Minhas Atividades" : "Relatório de Desempenho da Equipe"}
        description={
          isMember
            ? "Seus indicadores de entrega no período selecionado."
            : profile.role === "manager"
              ? "Produtividade dos colaboradores nos projetos que você gerencia."
              : "Produtividade de toda a organização."
        }
      />

      <div className="space-y-6">
        <ReportFilters
          period={range.period}
          from={format(range.from, "yyyy-MM-dd")}
          to={format(range.to, "yyyy-MM-dd")}
          projectId={projectId ?? "all"}
          projects={projectsRes.data ?? []}
        />
        <MetricCards totals={report.totals} />
        <TeamChart
          title={isMember ? "Concluídas vs Pendentes" : "Concluídas vs Pendentes por Colaborador"}
          data={report.rows.map((r) => ({
            name: r.profile.full_name || r.profile.email,
            concluidas: r.completed,
            pendentes: r.pending,
          }))}
        />
        <TeamTable rows={report.rows} />
      </div>
    </>
  );
}
