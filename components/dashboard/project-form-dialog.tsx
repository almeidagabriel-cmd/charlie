"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createProject, updateProject, type ProjectInput } from "@/app/(app)/dashboard/actions";
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
import { PROJECT_STATUS_CONFIG, PROJECT_STATUSES } from "@/lib/constants";
import type { Project, ProjectStatus } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  categories: string[];
}

const EMPTY: ProjectInput = {
  name: "",
  description: "",
  category: "",
  status: "planejamento",
  start_date: "",
  end_date: "",
};

export function ProjectFormDialog({ open, onOpenChange, project, categories }: Props) {
  const [form, setForm] = useState<ProjectInput>(EMPTY);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setForm(
      project
        ? {
            name: project.name,
            description: project.description ?? "",
            category: project.category ?? "",
            status: project.status,
            start_date: project.start_date ?? "",
            end_date: project.end_date ?? "",
          }
        : EMPTY,
    );
  }, [open, project]);

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = project ? await updateProject(project.id, form) : await createProject(form);
      if (!res.ok) return void toast.error(res.error);
      toast.success(project ? "Projeto atualizado." : "Projeto criado.");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          <DialogDescription>Defina as informações principais e o prazo do projeto.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-name">Nome *</Label>
            <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea id="p-desc" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-cat">Categoria</Label>
              <Input
                id="p-cat"
                list="project-categories"
                value={form.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Ex.: Marketing"
              />
              <datalist id="project-categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as ProjectStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{PROJECT_STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-start">Início</Label>
              <Input id="p-start" type="date" value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-end">Prazo final</Label>
              <Input id="p-end" type="date" value={form.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {project ? "Salvar alterações" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
