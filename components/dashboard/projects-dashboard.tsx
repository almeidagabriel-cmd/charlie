"use client";

import { useMemo, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/rbac";
import type { ProjectStatus, ProjectWithMeta, SessionUser } from "@/lib/types";
import { formatPercent } from "@/lib/utils";
import { ProjectCard } from "./project-card";
import { ProjectFilters } from "./project-filters";
import { ProjectFormDialog } from "./project-form-dialog";

export function ProjectsDashboard({ projects, currentUser }: { projects: ProjectWithMeta[]; currentUser: SessionUser }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectWithMeta | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(projects.map((p) => p.category).filter(Boolean) as string[])).sort(),
    [projects],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term)) &&
        (category === "all" || p.category === category) &&
        (status === "all" || p.status === status),
    );
  }, [projects, search, category, status]);

  const summary = useMemo(() => {
    const totalWeight = filtered.reduce((s, p) => s + p.progress.total_weight, 0);
    const doneWeight = filtered.reduce((s, p) => s + p.progress.done_weight, 0);
    return {
      projects: filtered.length,
      done: filtered.reduce((s, p) => s + p.progress.done_tasks, 0),
      pending: filtered.reduce((s, p) => s + (p.progress.total_tasks - p.progress.done_tasks), 0),
      progress: totalWeight ? (doneWeight / totalWeight) * 100 : 0,
    };
  }, [filtered]);

  const canCreate = can.createProject(currentUser);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Projetos", value: summary.projects },
          { label: "Entrega ponderada", value: formatPercent(summary.progress) },
          { label: "Tarefas concluídas", value: summary.done },
          { label: "Tarefas pendentes", value: summary.pending },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ProjectFilters
          search={search}
          onSearch={setSearch}
          category={category}
          onCategory={setCategory}
          categories={categories}
          status={status}
          onStatus={setStatus}
        />
        {canCreate ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Novo projeto
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={projects.length ? "Nenhum projeto corresponde aos filtros" : "Nenhum projeto ainda"}
          description={
            projects.length
              ? "Ajuste a busca ou os filtros para ver mais resultados."
              : canCreate
                ? "Crie o primeiro projeto para começar a organizar as tarefas da equipe."
                : "Quando você receber tarefas em algum projeto, ele aparecerá aqui."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              canManage={can.manageProject(currentUser, project)}
              onEdit={() => {
                setEditing(project);
                setFormOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editing} categories={categories} />
    </div>
  );
}
