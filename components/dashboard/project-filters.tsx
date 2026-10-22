"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROJECT_STATUS_CONFIG, PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectStatus } from "@/lib/types";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  category: string;
  onCategory: (v: string) => void;
  categories: string[];
  status: ProjectStatus | "all";
  onStatus: (v: ProjectStatus | "all") => void;
}

export function ProjectFilters({ search, onSearch, category, onCategory, categories, status, onStatus }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar projeto pelo nome..."
          className="pl-9"
        />
      </div>
      <Select value={category} onValueChange={onCategory}>
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => onStatus(v as ProjectStatus | "all")}>
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {PROJECT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{PROJECT_STATUS_CONFIG[s].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
