"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Task, TaskPriority, TaskStatus } from "@/lib/types";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (newTask: Task) => void;
}

export function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description: description || null,
        priority,
        status,
        due_date: dueDate || null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert("Erro ao criar a tarefa: " + error.message);
      return;
    }

    if (data) {
      onTaskCreated(data as Task);
      // Limpar formulário e fechar
      setTitle("");
      setDescription("");
      setPriority("media");
      setStatus("todo");
      setDueDate("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-slate-800">Criar Nova Tarefa</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Título *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Ex: Definir orçamento da campanha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Detalhes adicionais..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Coluna Inicial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">A Fazer</option>
                <option value="in_progress">Em Curso</option>
                <option value="in_review">Em Revisão</option>
                <option value="done">Concluído</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Prazo de Conclusão</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "A guardar..." : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}