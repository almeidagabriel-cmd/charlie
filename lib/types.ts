export type UserRole = "admin" | "manager" | "member" | "diretor";
export type ProjectStatus = "planejamento" | "em_andamento" | "pausado" | "concluido";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "baixa" | "media" | "alta" | "urgente";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  department: string | null;
  empresas?: string[] | null; // <--- Adicione esta linha
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type ProfileSummary = Pick<Profile, "id" | "full_name" | "email" | "avatar_url">;

/** Usuário logado, no formato mínimo exigido pelas checagens de permissão. */
export type SessionUser = Pick<Profile, "id" | "role">;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProjectProgress {
  project_id: string;
  total_tasks: number;
  done_tasks: number;
  total_weight: number;
  done_weight: number;
  progress: number;
}

export interface ProjectWithMeta extends Project {
  owner: ProfileSummary | null;
  progress: ProjectProgress;
}

export interface ProjectRef {
  id: string;
  name: string;
  created_by: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  weight: number;
  position: number;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  project: ProjectRef | null;
  assignee: ProfileSummary | null;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
  user: { full_name: string | null; email: string } | null;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
