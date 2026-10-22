"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ActivityLog } from "@/lib/types";
import { displayName, formatDateTime } from "@/lib/utils";

/** Linha do tempo de activity_logs da tarefa (audit trail). */
export function TaskHistory({ taskId, refreshKey }: { taskId: string; refreshKey?: string }) {
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("activity_logs")
      .select("*, user:profiles!activity_logs_user_id_fkey(full_name, email)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<ActivityLog[]>()
      .then(({ data }) => {
        if (!cancelled) setLogs(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, refreshKey]);

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4" /> Histórico de atividades
      </h3>
      {logs === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem registros.</p>
      ) : (
        <ol className="relative space-y-3 border-l pl-4">
          {logs.map((log) => (
            <li key={log.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
              <p className="text-sm">{log.action}</p>
              <p className="text-xs text-muted-foreground">
                {log.user ? displayName(log.user) : "Sistema"} · {formatDateTime(log.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
