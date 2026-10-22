"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Loader2, Plus, Radio, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TASK_STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";
import { allowedTargetStatuses, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/client";
import type { ProfileSummary, ProjectRef, SessionUser, Task, TaskStatus, TaskWithRelations } from "@/lib/types";
import { cn, displayName } from "@/lib/utils";
import { KanbanColumn } from "./kanban-column";
import { TaskDialog } from "./task-dialog";

interface Props {
  initialTasks: TaskWithRelations[];
  projects: ProjectRef[];
  profiles: ProfileSummary[];
  currentUser: SessionUser;
  initialProjectId?: string;
}

const STEP = 1024;

export function KanbanBoard({ initialTasks, projects, profiles, currentUser, initialProjectId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState(initialTasks);
  const [mounted, setMounted] = useState(false);
  const [live, setLive] = useState(false);

  const [projectFilter, setProjectFilter] = useState(
    initialProjectId && projects.some((p) => p.id === initialProjectId) ? initialProjectId : "all",
  );
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [dialog, setDialog] = useState<{ open: boolean; task: TaskWithRelations | null; status?: TaskStatus }>({
    open: false,
    task: null,
  });

  useEffect(() => setMounted(true), []);
  useEffect(() => setTasks(initialTasks), [initialTasks]);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const manageableProjects = useMemo(
    () => projects.filter((p) => can.manageProject(currentUser, p)),
    [projects, currentUser],
  );
  const canCreate = manageableProjects.length > 0;

  /** Junta os dados relacionais a uma linha "crua" vinda do Realtime. */
  const hydrate = useCallback(
    (row: Task, prev?: TaskWithRelations): TaskWithRelations => ({
      ...row,
      project: projectMap.get(row.project_id) ?? (prev?.project_id === row.project_id ? prev.project : null),
      assignee: row.assignee_id
        ? profileMap.get(row.assignee_id) ?? (prev?.assignee?.id === row.assignee_id ? prev.assignee : null)
        : null,
    }),
    [projectMap, profileMap],
  );

  // ---- Realtime: sincroniza alterações feitas por outros usuários ----
  useEffect(() => {
    const channel = supabase
      .channel("kanban-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as Partial<Task>).id;
          setTasks((prev) => prev.filter((t) => t.id !== id));
          return;
        }
        const row = payload.new as Task;
        setTasks((prev) => {
          const idx = prev.findIndex((t) => t.id === row.id);
          if (idx === -1) return [...prev, hydrate(row)];
          const next = [...prev];
          next[idx] = hydrate(row, prev[idx]);
          return next;
        });
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, hydrate]);

  // ---- Filtros ----
  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (projectFilter === "all" || t.project_id === projectFilter) &&
        (assigneeFilter === "all" ||
          (assigneeFilter === "none" ? !t.assignee_id : t.assignee_id === assigneeFilter)) &&
        (!term || t.title.toLowerCase().includes(term)),
    );
  }, [tasks, projectFilter, assigneeFilter, search]);

  const columns = useMemo(
    () =>
      TASK_STATUSES.map((col) => ({
        ...col,
        tasks: visibleTasks.filter((t) => t.status === col.value).sort((a, b) => a.position - b.position),
      })),
    [visibleTasks],
  );

  const allowedFor = useCallback(
    (task: TaskWithRelations) => allowedTargetStatuses(currentUser, task, task.project ?? projectMap.get(task.project_id)),
    [currentUser, projectMap],
  );

  const neighbors = useCallback(
    (task: TaskWithRelations) => {
      const allowed = allowedFor(task);
      const order = TASK_STATUSES.map((s) => s.value);
      const i = order.indexOf(task.status);
      const prev = order[i - 1];
      const next = order[i + 1];
      return {
        prev: prev && allowed.includes(prev) ? prev : undefined,
        next: next && allowed.includes(next) ? next : undefined,
      };
    },
    [allowedFor],
  );

  // ---- Mover tarefa (DnD ou ação rápida) ----
  const moveTask = useCallback(
    async (task: TaskWithRelations, toStatus: TaskStatus, toIndex?: number) => {
      if (!allowedFor(task).includes(toStatus)) {
        toast.error("Movimento não permitido", {
          description:
            toStatus === "backlog"
              ? "Apenas gestores podem mover tarefas para o Backlog."
              : "Você só pode alterar o status das tarefas atribuídas a você.",
        });
        return;
      }

      const dest = columns.find((c) => c.value === toStatus)!.tasks.filter((t) => t.id !== task.id);
      const index = toIndex ?? dest.length;
      const before = dest[index - 1]?.position;
      const after = dest[index]?.position;
      const position =
        before === undefined && after === undefined
          ? task.position
          : before === undefined
            ? after! - STEP
            : after === undefined
              ? before + STEP
              : (before + after) / 2;

      if (task.status === toStatus && position === task.position) return;

      const snapshot = tasks;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: toStatus, position } : t)));

      const { data, error } = await supabase
        .from("tasks")
        .update({ status: toStatus, position })
        .eq("id", task.id)
        .select("id");

      if (error || !data?.length) {
        setTasks(snapshot);
        toast.error("Não foi possível mover a tarefa", {
          description: error?.message ?? "Você não tem permissão para alterar esta tarefa.",
        });
        return;
      }
      if (task.status !== toStatus) toast.success(`"${task.title}" → ${TASK_STATUS_LABEL[toStatus]}`);
    },
    [allowedFor, columns, supabase, tasks],
  );

  function onDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;
    void moveTask(task, destination.droppableId as TaskStatus, destination.index);
  }

  const assigneeOptions = useMemo(() => {
    const ids = new Set(tasks.map((t) => t.assignee_id).filter(Boolean) as string[]);
    return profiles.filter((p) => ids.has(p.id));
  }, [tasks, profiles]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tarefa..." className="pl-9" />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {currentUser.role !== "member" ? (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="sm:w-52"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                <SelectItem value={currentUser.id}>Minhas tarefas</SelectItem>
                <SelectItem value="none">Sem responsável</SelectItem>
                {assigneeOptions
                  .filter((p) => p.id !== currentUser.id)
                  .map((p) => <SelectItem key={p.id} value={p.id}>{displayName(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn("flex items-center gap-1.5 text-xs", live ? "text-emerald-600" : "text-muted-foreground")}
            title={live ? "Sincronização em tempo real ativa" : "Conectando ao tempo real..."}
          >
            <Radio className="h-3.5 w-3.5" /> {live ? "Ao vivo" : "Conectando"}
          </span>
          {canCreate ? (
            <Button onClick={() => setDialog({ open: true, task: null, status: "todo" })}>
              <Plus /> Nova tarefa
            </Button>
          ) : null}
        </div>
      </div>

      {/* Board */}
      {mounted ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {columns.map((col) => (
              <KanbanColumn
                key={col.value}
                status={col.value}
                label={col.label}
                dot={col.dot}
                tasks={col.tasks}
                canCreate={canCreate}
                isDraggable={(t) => allowedFor(t).length > 0}
                neighbors={neighbors}
                onCreate={() => setDialog({ open: true, task: null, status: col.value })}
                onOpenTask={(task) => setDialog({ open: true, task })}
                onQuickMove={(task, status) => void moveTask(task, status)}
              />
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      <TaskDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        task={dialog.task ? tasks.find((t) => t.id === dialog.task!.id) ?? dialog.task : null}
        defaultStatus={dialog.status}
        defaultProjectId={projectFilter !== "all" ? projectFilter : undefined}
        manageableProjects={manageableProjects}
        profiles={profiles}
        currentUser={currentUser}
        allowedStatuses={dialog.task ? allowedFor(dialog.task) : []}
        onStatusChange={(task, status) => moveTask(task, status)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
