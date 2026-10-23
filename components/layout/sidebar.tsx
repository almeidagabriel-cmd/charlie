"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import { RoleBadge } from "@/components/shared/status-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { cn, displayName } from "@/lib/utils";

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // O cargo vem do banco (profiles.role). Para tornar alguém Colaborador,
  // altere o nível de acesso em "Usuários" — não é preciso mexer no código.
  const rawRole = profile?.role ?? "member";
  const isColaborador = rawRole === "member";

  // Itens do menu baseados no cargo do usuário
  const items = isColaborador
    ? [{ href: "/checklist", label: "Checklist Diário", icon: CheckSquare }]
    : [
        { href: "/checklist", label: "Checklist Diário", icon: CheckSquare },
        { href: "/planejamento", label: "Planeamento", icon: KanbanSquare },
        ...(rawRole === "admin" ? [{ href: "/usuarios", label: "Usuários", icon: Users }] : []),
      ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur shadow-sm">
      <div className="flex h-16 sm:h-20 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Botão Hambúrguer visível no telemóvel */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg border bg-slate-50"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link href={isColaborador ? "/checklist" : "/checklist"} className="flex items-center">
            <img src="/logo.png" alt="Charlie Logo" className="h-10 sm:h-12 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {profile && (
            <div className="flex items-center gap-2 sm:gap-3 sm:border-r sm:pr-4">
              <UserAvatar name={displayName(profile)} src={profile.avatar_url} className="h-8 w-8 sm:h-9 sm:w-9" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold leading-none text-slate-900">{displayName(profile)}</p>
                <div className="mt-1"><RoleBadge role={profile.role} /></div>
              </div>
            </div>
          )}

          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" className="text-slate-500 hover:text-red-600 p-2 sm:px-3">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Sair</span>
            </Button>
          </form>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}