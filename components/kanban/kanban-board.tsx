"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createBrowserClient } from "@supabase/ssr";
import { Task, TaskStatus } from "@/lib/types";
import { CreateTaskModal } from "./create-task-modal";

const COLUMNS_CONFIG: Record<TaskStatus, { title: string; color: string }> = {
  backlog: { title: "Backlog", color: "bg-gray-200 text-gray-700" },
  todo: { title: "A Fazer", color: "bg-blue-100 text-blue-800" },
  in_progress: { title: "Em Curso", color: "bg-yellow-100 text-yellow-800" },
  in_review: { title: "Em Revisão", color: "bg-purple-100 text-purple-800" },
  done: { title: "Concluído", color: "bg-green-100 text-green-800" },
};

const COLUMNS_ORDER: TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"];

interface KanbanBoardProps {
  initialTasks: Task[];
}

export function KanbanBoard({ initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;

    // 1. Atualização Otimista na Interface
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    // 2. Persistir a alteração no Supabase
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", draggableId);

    if (error) {
      console.error("Erro ao atualizar o estado no Supabase:", error.message);
      // Reverter se houver erro
      setTasks(initialTasks);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask]);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Barra de Ações do Kanban */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors"
        >
          <span>+</span> Nova Tarefa
        </button>
      </div>

      {/* Quadro Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
          {COLUMNS_ORDER.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);

            return (
              <div key={status} className="flex min-w-[280px] w-80 flex-col rounded-lg bg-slate-100 p-3 shadow-inner">
                <div className={`mb-3 flex items-center justify-between rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${COLUMNS_CONFIG[status].color}`}>
                  <span>{COLUMNS_CONFIG[status].title}</span>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-black font-semibold">
                    {columnTasks.length}
                  </span>
                </div>

                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-1 flex-col gap-2.5 min-h-[150px] overflow-y-auto"
                    >
                      {columnTasks.map((task, index) => {
                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-lg border bg-white p-3.5 shadow-sm transition-all hover:shadow-md ${
                                  snapshot.isDragging ? "shadow-xl ring-2 ring-blue-500" : "border-slate-200"
                                }`}
                              >
                                <h4 className="font-semibold text-slate-800 text-sm leading-snug">{task.title}</h4>

                                {task.description && (
                                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
                                )}

                                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                                  {/* Badge de Prioridade */}
                                  <span className={`capitalize font-medium px-2 py-0.5 rounded ${
                                    task.priority === "urgente" ? "bg-red-100 text-red-700" :
                                    task.priority === "alta" ? "bg-orange-100 text-orange-700" :
                                    task.priority === "media" ? "bg-blue-100 text-blue-700" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>
                                    {task.priority}
                                  </span>

                                  {/* Prazo com alerta vermelho de atraso */}
                                  {task.due_date && (
                                    <span className={`font-medium ${isOverdue ? "text-red-600 font-bold" : "text-slate-500"}`}>
                                      {isOverdue ? "⚠️ Atrasado: " : "📅 "}
                                      {new Date(task.due_date).toLocaleDateString('pt-PT')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal de Criar Tarefa */}
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}    