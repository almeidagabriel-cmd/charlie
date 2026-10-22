import { clsx, type ClassValue } from "clsx";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata 'yyyy-MM-dd' ou ISO timestamp para dd/MM/yyyy. */
export function formatDate(value: string | null | undefined, pattern = "dd/MM/yyyy") {
  if (!value) return "—";
  return format(parseISO(value), pattern, { locale: ptBR });
}

export function formatDateTime(value: string) {
  return format(parseISO(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function isOverdue(dueDate: string | null, done: boolean) {
  if (!dueDate || done) return false;
  return isBefore(parseISO(dueDate), startOfDay(new Date()));
}

export function getInitials(name: string | null | undefined, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function displayName(p: { full_name: string | null; email: string } | null | undefined) {
  if (!p) return "Sem responsável";
  return p.full_name || p.email;
}

/** Vermelho (<40%), Amarelo (40–75%), Verde (>75%). */
export function progressTone(pct: number) {
  if (pct < 40) return { bar: "bg-red-500", text: "text-red-600" };
  if (pct <= 75) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-emerald-500", text: "text-emerald-600" };
}

export function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
