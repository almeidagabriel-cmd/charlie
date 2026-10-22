"use client";

import { useMemo, useState, useTransition } from "react";
import { KeyRound, Search, ShieldCheck, UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { sendPasswordReset, setUserActive, updateUserRole } from "@/app/(app)/usuarios/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABEL, ROLES } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types";
import { cn, displayName, formatDate } from "@/lib/utils";
import { CreateUserDialog } from "./create-user-dialog";

type Pending =
  | { kind: "toggle"; user: Profile }
  | { kind: "reset"; user: Profile }
  | null;

export function UsersManager({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<Pending>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === "all" || u.role === roleFilter) &&
        (!term ||
          u.email.toLowerCase().includes(term) ||
          (u.full_name ?? "").toLowerCase().includes(term) ||
          (u.department ?? "").toLowerCase().includes(term)),
    );
  }, [users, search, roleFilter]);

  const counts = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      admins: users.filter((u) => u.role === "admin").length,
      managers: users.filter((u) => u.role === "manager").length,
    }),
    [users],
  );

  function changeRole(user: Profile, role: UserRole) {
    setBusyId(user.id);
    startTransition(async () => {
      const res = await updateUserRole(user.id, role);
      setBusyId(null);
      if (res.ok) toast.success(`${displayName(user)} agora é ${ROLE_LABEL[role]}.`);
      else toast.error(res.error);
    });
  }

  async function runConfirm() {
    if (!confirm) return;
    const { user } = confirm;
    if (confirm.kind === "toggle") {
      const res = await setUserActive(user.id, !user.is_active);
      if (res.ok) toast.success(user.is_active ? "Conta desativada." : "Conta reativada.");
      else toast.error(res.error);
    } else {
      const res = await sendPasswordReset(user.email);
      if (res.ok) toast.success(`Link de redefinição enviado para ${user.email}.`);
      else toast.error(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Usuários", value: counts.total },
          { label: "Ativos", value: counts.active },
          { label: "Administradores", value: counts.admins },
          { label: "Gestores", value: counts.managers },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, e-mail ou departamento" className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus /> Novo usuário
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead className="w-48">Nível de acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum usuário encontrado.</TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const isMe = u.id === currentUserId;
                return (
                  <TableRow key={u.id} className={cn(!u.is_active && "opacity-60")}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={displayName(u)} src={u.avatar_url} className="h-9 w-9" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium">
                            {displayName(u)}
                            {isMe ? <Badge variant="secondary" className="px-1.5 text-[10px]">você</Badge> : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.department ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isMe || busyId === u.id}
                        onValueChange={(v) => changeRole(u, v as UserRole)}
                      >
                        <SelectTrigger className="h-9">
                          <span className="flex items-center gap-2">
                            {u.role === "admin" ? <ShieldCheck className="h-4 w-4 text-purple-600" /> : null}
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Desativado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Enviar link de redefinição de senha"
                          onClick={() => setConfirm({ kind: "reset", user: u })}
                          disabled={!u.is_active}
                        >
                          <KeyRound />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={u.is_active ? "Desativar conta" : "Reativar conta"}
                          onClick={() => setConfirm({ kind: "toggle", user: u })}
                          disabled={isMe}
                          className={u.is_active ? "text-destructive hover:text-destructive" : "text-emerald-600"}
                        >
                          {u.is_active ? <UserX /> : <UserCheck />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === "reset"
            ? "Enviar redefinição de senha?"
            : confirm?.user.is_active
              ? "Desativar conta?"
              : "Reativar conta?"
        }
        description={
          confirm?.kind === "reset"
            ? `Um link para criar nova senha será enviado para ${confirm.user.email}.`
            : confirm?.user.is_active
              ? `${displayName(confirm.user)} perderá o acesso imediatamente. As tarefas e o histórico serão mantidos.`
              : `${confirm ? displayName(confirm.user) : ""} voltará a ter acesso ao sistema.`
        }
        confirmLabel={confirm?.kind === "reset" ? "Enviar link" : confirm?.user.is_active ? "Desativar" : "Reativar"}
        destructive={confirm?.kind === "toggle" && confirm.user.is_active}
        onConfirm={runConfirm}
      />
    </div>
  );
}
