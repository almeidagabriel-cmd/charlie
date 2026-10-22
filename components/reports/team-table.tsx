import { RoleBadge } from "@/components/shared/status-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CollaboratorRow } from "@/lib/reports";
import { cn, formatPercent, progressTone } from "@/lib/utils";

export function TeamTable({ rows }: { rows: CollaboratorRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhamento da equipe</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Atribuídas</TableHead>
              <TableHead className="text-right">Concluídas</TableHead>
              <TableHead className="text-right">Cycle time</TableHead>
              <TableHead className="w-48">Entregabilidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum dado para o período.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const tone = progressTone(r.rate);
                return (
                  <TableRow key={r.profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={r.profile.full_name ?? r.profile.email} src={r.profile.avatar_url} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.profile.full_name ?? r.profile.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.profile.department ?? r.profile.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={r.profile.role} /></TableCell>
                    <TableCell className="text-right tabular-nums">{r.assigned}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.completed}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.avgCycleDays === null ? "—" : `${r.avgCycleDays.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} d`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.rate} indicatorClassName={tone.bar} className="h-1.5" />
                        <span className={cn("w-12 text-right text-xs font-semibold tabular-nums", tone.text)}>
                          {formatPercent(r.rate)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
