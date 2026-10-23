import type { SessionUser, Task, TaskStatus, UserRole } from "./types";

export const ALL_ROLES: UserRole[] = ["admin", "manager", "member", "diretor"];

/** Rotas acessíveis sem sessão. */
export const PUBLIC_ROUTES = ["/login", "/auth"];

/** Mapa de rotas protegidas → cargos permitidos (verificado no middleware). */
export const ROUTE_ACCESS: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/usuarios", roles: ["admin"] },
  { prefix: "/checklist", roles: ALL_ROLES },
];

/** Página inicial de cada cargo: Todos vão para o Checklist agora. */
export function homePath(role: UserRole) {
  return "/checklist";
}

export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function canAccessRoute(role: UserRole, pathname: string) {
  const rule = ROUTE_ACCESS.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return rule ? rule.roles.includes(role) : true;
}

/**
 * Espelho no front das regras de RLS do banco.
 * Serve para UX (esconder/desabilitar ações) — o banco é a fonte da verdade.
 */
export const can = {
  manageUsers: (u: SessionUser) => u.role === "admin",
  createProject: (u: SessionUser) => u.role === "admin" || u.role === "manager",
  manageProject: (u: SessionUser, project: { created_by: string | null } | null | undefined) =>
    u.role === "admin" || (u.role === "manager" && !!project && project.created_by === u.id),
  viewTeamReports: (u: SessionUser) => u.role === "admin" || u.role === "manager",
};

/** Status para os quais o usuário pode mover a tarefa. */
export function allowedTargetStatuses(
  u: SessionUser,
  task: Pick<Task, "assignee_id">,
  project: { created_by: string | null } | null | undefined,
): TaskStatus[] {
  if (can.manageProject(u, project)) return ["backlog", "todo", "in_progress", "in_review", "done"];
  if (task.assignee_id === u.id) return ["todo", "in_progress", "in_review", "done"];
  return [];
}