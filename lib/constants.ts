import type { ProjectStatus, TaskPriority, TaskStatus, UserRole } from "./types";

export const TASK_STATUSES: { value: TaskStatus; label: string; dot: string }[] = [
  { value: "backlog", label: "Backlog", dot: "bg-slate-400" },
  { value: "todo", label: "A Fazer", dot: "bg-blue-500" },
  { value: "in_progress", label: "Em Andamento", dot: "bg-amber-500" },
  { value: "in_review", label: "Em Revisão", dot: "bg-violet-500" },
  { value: "done", label: "Concluído", dot: "bg-emerald-500" },
];

export const TASK_STATUS_LABEL = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label]),
) as Record<TaskStatus, string>;

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-slate-100 text-slate-700 border-slate-200" },
  media: { label: "Média", className: "bg-sky-100 text-sky-800 border-sky-200" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-800 border-orange-200" },
  urgente: { label: "Urgente", className: "bg-red-100 text-red-800 border-red-200" },
};

export const PRIORITIES = Object.keys(PRIORITY_CONFIG) as TaskPriority[];

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  planejamento: { label: "Planejamento", className: "bg-slate-100 text-slate-700 border-slate-200" },
  em_andamento: { label: "Em andamento", className: "bg-blue-100 text-blue-800 border-blue-200" },
  pausado: { label: "Pausado", className: "bg-amber-100 text-amber-800 border-amber-200" },
  concluido: { label: "Concluído", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_CONFIG) as ProjectStatus[];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Gestor",
  member: "Colaborador",
};

export const ROLES = Object.keys(ROLE_LABEL) as UserRole[];
