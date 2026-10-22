"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarDays, Loader2, Trash2, Weight } from "lucide-react";
import { toast } from "sonner";
import { createTask, deleteTask, updateTask, type TaskInput } from "@/app/(app)/kanban/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PriorityBadge } from "@/components/shared/status-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, PRIORITY_CONFIG, TASK_STATUS_LABEL, TASK_STATUSES } from "@/lib/constants";
import { can } from "@/lib/rbac";
import type { ProfileSummary, ProjectRef, SessionUser, TaskPriority, TaskStatus, TaskWithRelations } from "@/lib/types";
import { displayName, formatDate } from "@/lib/utils";
import { TaskHistory } from "./task-history";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithRelations | null;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string;
  manageableProjects: ProjectRef[];
  profiles: ProfileSummary[];
  currentUser: SessionUser;
  allowedStatuses: TaskStatus[];
  onStatusChange: (task: TaskWithRelations, status: TaskStatus) => Promise<void>;
  onSaved: () => void;
}

type FormState = Required<Pick<TaskInput, "project_id" | "title" | "status" | "priority" | "weight">> & {
  description: string;
  assignee_id: string | null;
  due_date: string;
};

export function TaskDialog(props: Props) {
  const { open, onOpenChange, task, currentUser } = props;
  const editable = !task || can.manageProject(currentUser, task.project);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {editable ? <TaskForm {...props} /> : task ? <TaskReadOnly {...props} task={task} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Gestor / Admin --------------------------- */

function TaskForm({
  open,
  onOpenChange,
  task,
  defaultStatus,
  defaultProjectId,
  manageableProjects,
  profiles,
  onSaved,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm());

  function initialForm(): FormState {
    if (task) {
      return {
        project_id: task.project_id,
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        assignee_id: task.assignee_id,
        weight: task.weight,
        due_date: task.due_date ?? "",
      };
    }
    return {
      project_id: defaultProjectId && manageableProjects.some((p) => p.id === defaultProjectId)
        ? defaultProjectId
        : manageableProjects[0]?.id ?? "",
      title: "",
      description: "",
      status: defaultStatus ?? "todo",
      priority: "media",
      assignee_id: null,
      weight: 1,
      due_date: "",
    };
  }

  useEffect(() => {
    if (open) setForm(initialForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = task ? await updateTask(task.id, form) : await createTask(form);
      if (!res.ok) return void toast.error(res.error);
      toast.success(task ? "Tarefa atualizada." : "Tarefa criada.");
      onSaved();
      onOpenChange(false);
    });
  }

  async function handleDelete() {
    if (!task) return;
    const res = await deleteTask(task.id);
    if (!res.ok) return void toast.error(res.error);
    toast.success("Tarefa excluída.");
    onSaved();
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        <DialogDescription>
          O peso de complexidade é usado no cálculo ponderado do progresso do projeto.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="t-title">Título *</Label>
          <Input id="t-title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-desc">Descrição</Label>
          <Textarea id="t-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Projeto *">
            <Select value={form.project_id} onValueChange={(v) => set("project_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {manageableProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Responsável">
            <Select value={form.assignee_id ?? "none"} onValueChange={(v) => set("assignee_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{displayName(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v as TaskStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={form.priority} onValueChange={(v) => set("priority", v as TaskPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Peso (complexidade 1–100)" htmlFor="t-weight">
            <Input
              id="t-weight"
              type="number"
              min={1}
              max={100}
              value={form.weight}
              onChange={(e) => set("weight", Number(e.target.value))}
            />
          </Field>
          <Field label="Data limite" htmlFor="t-due">
            <Input id="t-due" type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
          </Field>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {task ? (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Excluir
            </Button>
          ) : <span />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending || !form.project_id}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {task ? "Salvar" : "Criar tarefa"}
            </Button>
          </div>
        </DialogFooter>
      </form>

      {task ? (
        <div className="border-t pt-4">
          <TaskHistory taskId={task.id} refreshKey={task.updated_at} />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir tarefa?"
        description="A tarefa e seu histórico de atividades serão removidos permanentemente."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </>
  );
}

/* ----------------------------- Colaborador ---------------------------- */

function TaskReadOnly({ task, allowedStatuses, onStatusChange }: Props & { task: TaskWithRelations }) {
  const [pending, startTransition] = useTransition();
  const canChange = allowedStatuses.length > 0;

  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <span className="text-xs text-muted-foreground">{task.project?.name}</span>
        </div>
        <DialogTitle className="pt-1 leading-snug">{task.title}</DialogTitle>
        {task.description ? (
          <DialogDescription className="whitespace-pre-wrap">{task.description}</DialogDescription>
        ) : (
          <DialogDescription>Sem descrição.</DialogDescription>
        )}
      </DialogHeader>

      <dl className="grid gap-4 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Responsável</dt>
          <dd className="flex items-center gap-2">
            <UserAvatar name={displayName(task.assignee)} src={task.assignee?.avatar_url} className="h-6 w-6 text-[10px]" />
            {displayName(task.assignee)}
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Data limite</dt>
          <dd className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {formatDate(task.due_date)}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Peso</dt>
          <dd className="flex items-center gap-1.5"><Weight className="h-4 w-4" /> {task.weight}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Status</dt>
          <dd>
            {canChange ? (
              <Select
                value={task.status}
                disabled={pending}
                onValueChange={(v) => startTransition(() => onStatusChange(task, v as TaskStatus))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value} disabled={!allowedStatuses.includes(s.value) && s.value !== task.status}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              TASK_STATUS_LABEL[task.status]
            )}
          </dd>
        </div>
      </dl>

      <TaskHistory taskId={task.id} refreshKey={`${task.status}-${task.updated_at}`} />
    </>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
