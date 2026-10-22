import { endOfDay, isValid, parseISO, startOfDay, startOfMonth, subDays } from "date-fns";
import type { Profile, Task } from "./types";

export type Period = "7d" | "mes" | "custom";

export interface DateRange {
  period: Period;
  from: Date;
  to: Date;
}

export type ReportTask = Pick<
  Task,
  "id" | "project_id" | "status" | "assignee_id" | "weight" | "created_at" | "started_at" | "completed_at"
>;
export type ReportProfile = Pick<Profile, "id" | "full_name" | "email" | "role" | "department" | "avatar_url">;

export interface CollaboratorRow {
  profile: ReportProfile;
  assigned: number;
  completed: number;
  pending: number;
  rate: number;
  avgCycleDays: number | null;
}

export interface ReportResult {
  totals: {
    inScope: number;
    completed: number;
    pending: number;
    completionRate: number;
    avgCycleDays: number | null;
    weightedRate: number;
  };
  rows: CollaboratorRow[];
}

const DAY_MS = 86_400_000;

export function resolveRange(period?: string, from?: string, to?: string): DateRange {
  const now = new Date();
  if (period === "custom" && from && to) {
    const f = parseISO(from);
    const t = parseISO(to);
    if (isValid(f) && isValid(t) && f <= t) return { period: "custom", from: startOfDay(f), to: endOfDay(t) };
  }
  if (period === "mes") return { period: "mes", from: startOfMonth(now), to: endOfDay(now) };
  return { period: "7d", from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
}

/**
 * Regras:
 * - Tarefas "no escopo" do período: criadas até o fim do período e que ainda
 *   estavam abertas em algum momento dele (não concluídas antes do início).
 * - Finalizadas no período: status 'done' com completed_at dentro do intervalo.
 * - Taxa de conclusão = finalizadas / no escopo.
 * - Cycle time = completed_at − (started_at ?? created_at), em dias.
 */
export function computeReport(tasks: ReportTask[], profiles: ReportProfile[], range: DateRange): ReportResult {
  const from = range.from.getTime();
  const to = range.to.getTime();

  const completedIn = (t: ReportTask) => {
    if (t.status !== "done" || !t.completed_at) return false;
    const c = new Date(t.completed_at).getTime();
    return c >= from && c <= to;
  };

  const inScope = tasks.filter((t) => {
    if (new Date(t.created_at).getTime() > to) return false;
    if (t.status === "done" && t.completed_at && new Date(t.completed_at).getTime() < from) return false;
    return true;
  });

  const cycleDays = (t: ReportTask) =>
    (new Date(t.completed_at!).getTime() - new Date(t.started_at ?? t.created_at).getTime()) / DAY_MS;

  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

  const completed = inScope.filter(completedIn);
  const totalWeight = inScope.reduce((s, t) => s + t.weight, 0);
  const doneWeight = completed.reduce((s, t) => s + t.weight, 0);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const byUser = new Map<string, ReportTask[]>();
  for (const t of inScope) {
    if (!t.assignee_id) continue;
    const list = byUser.get(t.assignee_id) ?? [];
    list.push(t);
    byUser.set(t.assignee_id, list);
  }

  const rows: CollaboratorRow[] = [];
  for (const [userId, list] of Array.from(byUser.entries())) {
    const profile = profileMap.get(userId);
    if (!profile) continue;
    const done = list.filter(completedIn);
    rows.push({
      profile,
      assigned: list.length,
      completed: done.length,
      pending: list.length - done.length,
      rate: list.length ? (done.length / list.length) * 100 : 0,
      avgCycleDays: avg(done.map(cycleDays)),
    });
  }
  rows.sort((a, b) => b.completed - a.completed || b.rate - a.rate);

  return {
    totals: {
      inScope: inScope.length,
      completed: completed.length,
      pending: inScope.length - completed.length,
      completionRate: inScope.length ? (completed.length / inScope.length) * 100 : 0,
      avgCycleDays: avg(completed.map(cycleDays)),
      weightedRate: totalWeight ? (doneWeight / totalWeight) * 100 : 0,
    },
    rows,
  };
}
