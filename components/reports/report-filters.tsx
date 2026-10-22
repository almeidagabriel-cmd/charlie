"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Period } from "@/lib/reports";

interface Props {
  period: Period;
  from: string;
  to: string;
  projectId: string;
  projects: { id: string; name: string }[];
}

export function ReportFilters({ period, from, to, projectId, projects }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [localPeriod, setLocalPeriod] = useState<Period>(period);

  function push(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  const base = { periodo: localPeriod, projeto: projectId !== "all" ? projectId : undefined };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-end">
      <div className="space-y-2 lg:w-48">
        <Label>Período</Label>
        <Select
          value={localPeriod}
          onValueChange={(v) => {
            const p = v as Period;
            setLocalPeriod(p);
            if (p !== "custom") push({ ...base, periodo: p });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="mes">Mês atual</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {localPeriod === "custom" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="r-from">De</Label>
            <Input id="r-from" type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-to">Até</Label>
            <Input id="r-to" type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
          <Button
            variant="secondary"
            onClick={() => push({ ...base, periodo: "custom", de: customFrom, ate: customTo })}
            disabled={!customFrom || !customTo || customFrom > customTo}
          >
            Aplicar
          </Button>
        </>
      ) : null}

      <div className="space-y-2 lg:ml-auto lg:w-64">
        <Label>Projeto</Label>
        <Select
          value={projectId}
          onValueChange={(v) =>
            push({
              ...base,
              projeto: v !== "all" ? v : undefined,
              de: localPeriod === "custom" ? customFrom : undefined,
              ate: localPeriod === "custom" ? customTo : undefined,
            })
          }
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {pending ? <Loader2 className="h-5 w-5 animate-spin self-center text-muted-foreground" /> : null}
    </div>
  );
}
