"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, CircleDashed, KanbanSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/app/(app)/dashboard/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProjectStatusBadge } from "@/components/shared/status-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import type { ProjectWithMeta } from "@/lib/types";
import { cn, displayName, formatDate, formatPercent, isOverdue, progressTone } from "@/lib/utils";

interface Props {
  project: ProjectWithMeta;
  canManage: boolean;
  onEdit: () => void;
}

export function ProjectCard({ project, canManage, onEdit }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { progress } = project;
  const pct = Number(progress.progress) || 0;
  const tone = progressTone(pct);
  const pending = progress.total_tasks - progress.done_tasks;
  const late = isOverdue(project.end_date, project.status === "concluido");

  async function handleDelete() {
    const res = await deleteProject(project.id);
    if (res.ok) toast.success("Projeto excluído.");
    else toast.error(res.error);
  }

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {project.category ? <Badge variant="secondary">{project.category}</Badge> : null}
              <ProjectStatusBadge status={project.status} />
            </div>
            <CardTitle className="line-clamp-2">{project.name}</CardTitle>
          </div>
          {canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 shrink-0" aria-label="Ações do projeto">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {project.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Entrega (ponderada)</span>
            <span className={cn("font-semibold tabular-nums", tone.text)}>{formatPercent(pct)}</span>
          </div>
          <Progress value={pct} indicatorClassName={tone.bar} aria-label={`Progresso ${pct}%`} />
          <p className="text-xs text-muted-foreground">
            {progress.done_weight} de {progress.total_weight} pontos de complexidade
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span><strong className="tabular-nums">{progress.done_tasks}</strong> concluídas</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <CircleDashed className="h-4 w-4" />
            <span><strong className="tabular-nums">{pending}</strong> pendentes</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t pt-4">
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={displayName(project.owner)} src={project.owner?.avatar_url} className="h-7 w-7" />
            <span className="truncate text-muted-foreground">{project.owner ? displayName(project.owner) : "—"}</span>
          </div>
          <span className={cn("flex shrink-0 items-center gap-1", late ? "font-medium text-red-600" : "text-muted-foreground")}>
            <CalendarDays className="h-4 w-4" />
            {formatDate(project.end_date)}
          </span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/kanban?project=${project.id}`}>
            <KanbanSquare /> Abrir no Kanban
          </Link>
        </Button>
      </CardFooter>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir projeto?"
        description={`"${project.name}" e todas as suas tarefas e históricos serão removidos permanentemente.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </Card>
  );
}
