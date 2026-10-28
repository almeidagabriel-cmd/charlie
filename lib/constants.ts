export const ROLES = ["admin", "manager", "member", "diretor", "analista", "gerente"] as const;

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  member: "Colaborador",
  diretor: "Diretor",
  analista: "Analista",
  gerente: "Gerente",
};

export const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-slate-100 text-slate-700" },
  media: { label: "Média", className: "bg-blue-100 text-blue-700" },
  alta: { label: "Alta", className: "bg-amber-100 text-amber-700" },
  urgente: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

export const PROJECT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planejamento: { label: "Planejamento", className: "bg-slate-100 text-slate-700" },
  em_andamento: { label: "Em Andamento", className: "bg-blue-100 text-blue-700" },
  pausado: { label: "Pausado", className: "bg-amber-100 text-amber-700" },
  concluido: { label: "Concluído", className: "bg-emerald-100 text-emerald-700" },
};