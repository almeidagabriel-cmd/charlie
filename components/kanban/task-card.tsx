"use client";

import { Draggable } from "@hello-pangea/dnd";
import { CalendarDays, ChevronLeft, ChevronRight, Weight } from "lucide-react";
import { PriorityBadge } from "@/components/shared/status-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TASK_STATUS_LABEL } from "@/lib/constants";
import type { TaskStatus, TaskWithRelations } from "@/lib/types";
import { cn, displayName, formatDate, isOverdue } from "@/lib/utils";

interface Props {
  task: TaskWithRelations;
  index: number;
  draggable: boolean;
  prevStatus?: TaskStatus;
  nextStatus?: TaskStatus;
  onOpen: () => void;
  onQuickMove: (status: TaskStatus) => void;
}

export function TaskCard({ task, index, draggable, prevStatus, nextStatus, onOpen, onQuickMove }: Props) {
  const overdue = isOverdue(task.due_date, task.status === "done");

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!draggable}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") onOpen();
          }}
          className={cn(
            "group mb-2 select-none rounded-md border bg-card p-3 text-left shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
            snapshot.isDragging && "rotate-1 shadow-lg ring-2 ring-primary/40",
            task.status === "done" && "opacity-80",
            !draggable && "cursor-pointer",
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <PriorityBadge priority={task.priority} className="px-2 text-[11px]" />
            <span
              title="Peso de complexidade"
              className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              <Weight className="h-3 w-3" /> {task.weight}
            </span>
          </div>

          <p className={cn("text-sm font-medium leading-snug", task.status === "done" && "line-through decoration-muted-foreground/50")}>
            {task.title}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{task.project?.name ?? "—"}</p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <UserAvatar name={displayName(task.assignee)} src={task.assignee?.avatar_url} className="h-6 w-6 text-[10px]" />
              <span className="truncate text-xs text-muted-foreground">
                {task.assignee ? displayName(task.assignee).split(" ")[0] : "Sem responsável"}
              </span>
            </div>
            {task.due_date ? (
              <span className={cn("flex shrink-0 items-center gap-1 text-xs", overdue ? "font-medium text-red-600" : "text-muted-foreground")}>
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(task.due_date, "dd/MM")}
              </span>
            ) : null}
          </div>

          {draggable && (prevStatus || nextStatus) ? (
            <div className="mt-2 flex justify-between border-t pt-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              <QuickButton status={prevStatus} direction="left" onMove={onQuickMove} />
              <QuickButton status={nextStatus} direction="right" onMove={onQuickMove} />
            </div>
          ) : null}
        </div>
      )}
    </Draggable>
  );
}

function QuickButton({
  status,
  direction,
  onMove,
}: {
  status?: TaskStatus;
  direction: "left" | "right";
  onMove: (s: TaskStatus) => void;
}) {
  if (!status) return <span />;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onMove(status);
      }}
      className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={`Mover para ${TASK_STATUS_LABEL[status]}`}
    >
      {direction === "left" ? <ChevronLeft className="h-3.5 w-3.5" /> : null}
      {TASK_STATUS_LABEL[status]}
      {direction === "right" ? <ChevronRight className="h-3.5 w-3.5" /> : null}
    </button>
  );
}
