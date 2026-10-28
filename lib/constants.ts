export const ROLES = ["admin", "manager", "member", "diretor", "analista", "gerente"] as const;

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  member: "Colaborador",
  diretor: "Diretor",
  analista: "Analista",
  gerente: "Gerente",
};