import { CheckCircle2, CircleDashed, Gauge, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ReportResult } from "@/lib/reports";
import { formatPercent, progressTone } from "@/lib/utils";

export function MetricCards({ totals }: { totals: ReportResult["totals"] }) {
  const tone = progressTone(totals.completionRate);
  const cycle =
    totals.avgCycleDays === null
      ? "—"
      : `${totals.avgCycleDays.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <Header icon={Gauge} label="Taxa de conclusão" />
          <p className="text-3xl font-semibold tabular-nums">{formatPercent(totals.completionRate)}</p>
          <Progress value={totals.completionRate} indicatorClassName={tone.bar} />
          <p className="text-xs text-muted-foreground">Ponderada por peso: {formatPercent(totals.weightedRate)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-5">
          <Header icon={CheckCircle2} label="Tarefas finalizadas" />
          <p className="text-3xl font-semibold tabular-nums">{totals.completed}</p>
          <p className="text-xs text-muted-foreground">de {totals.inScope} tarefas ativas no período</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-5">
          <Header icon={Timer} label="Tempo médio de conclusão" />
          <p className="text-3xl font-semibold tabular-nums">{cycle}</p>
          <p className="text-xs text-muted-foreground">Cycle time: início do trabalho → concluído</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-5">
          <Header icon={CircleDashed} label="Pendentes" />
          <p className="text-3xl font-semibold tabular-nums">{totals.pending}</p>
          <p className="text-xs text-muted-foreground">Ainda não concluídas no período</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Header({ icon: Icon, label }: { icon: typeof Gauge; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" /> {label}
    </div>
  );
}
