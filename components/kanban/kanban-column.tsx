"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskStatus, TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

interface Props {
  status: TaskStatus;
  label: string;
  dot: string;
  tasks: TaskWithRelations[];
  canCreate: boolean;
  isDraggable: (task: TaskWithRelations) => boolean;
  neighbors: (task: TaskWithRelations) => { prev?: TaskStatus; next?: TaskStatus };
  onCreate: () => void;
  onOpenTask: (task: TaskWithRelations) => void;
  onQuickMove: (task: TaskWithRelations, status: TaskStatus) => void;
}

export function KanbanColumn({
  status,
  label,
  dot,
  tasks,
  canCreate,
  isDraggable,
  neighbors,
  onCreate,
  onOpenTask,
  onQuickMove,
}: Props) {
  const weight = tasks.reduce((s, t) => s + t.weight, 0);

  return (
    <section className="flex w-[290px] shrink-0 flex-col rounded-lg border bg-muted/40 lg:w-auto lg:min-w-0 lg:flex-1">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
          <h2 className="text-sm font-semibold">{label}</h2>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground" title="Soma dos pesos">{weight} pts</span>
          {canCreate ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCreate} aria-label={`Nova tarefa em ${label}`}>
              <Plus />
            </Button>
          ) : null}
        </div>
      </header>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[140px] flex-1 overflow-y-auto rounded-b-lg px-2 pb-2 transition-colors lg:max-h-[calc(100vh-260px)]",
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            {tasks.map((task, index) => {
              const n = neighbors(task);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  draggable={isDraggable(task)}
                  prevStatus={n.prev}
                  nextStatus={n.next}
                  onOpen={() => onOpenTask(task)}
                  onQuickMove={(s) => onQuickMove(task, s)}
                />
              );
            })}
            {provided.placeholder}
            {tasks.length === 0 && !snapshot.isDraggingOver ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma tarefa</p>
            ) : null}
          </div>
        )}
      </Droppable>
    </section>
  );
}
