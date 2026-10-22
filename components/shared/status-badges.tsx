import { Badge } from "@/components/ui/badge";
import { PRIORITY_CONFIG, PROJECT_STATUS_CONFIG, ROLE_LABEL } from "@/lib/constants";
import type { ProjectStatus, TaskPriority, UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const cfg = PRIORITY_CONFIG[priority];
  return <Badge variant="outline" className={cn(cfg.className, className)}>{cfg.label}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = PROJECT_STATUS_CONFIG[status];
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}

const ROLE_CLASS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  manager: "bg-indigo-100 text-indigo-800 border-indigo-200",
  member: "bg-slate-100 text-slate-700 border-slate-200",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant="outline" className={ROLE_CLASS[role]}>{ROLE_LABEL[role]}</Badge>;
}
