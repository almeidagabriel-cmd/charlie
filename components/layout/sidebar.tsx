"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, KanbanSquare, LayoutDashboard, LogOut, Users } from "lucide-react";
import { logout } from "@/app/login/actions";
import { RoleBadge } from "@/components/shared/status-badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import type { Profile, UserRole } from "@/lib/types";
import { cn, displayName } from "@/lib/utils";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; roles?: UserRole[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kanban", label: "Quadro Kanban", icon: KanbanSquare },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/usuarios", label: "Usuários", icon: Users, roles: ["admin"] },
];

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.roles || i.roles.includes(profile.role));

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur shadow-sm">
      {/* Container de largura total (w-full) para jogar o logo na extrema esquerda e o perfil na extrema direita */}
      <div className="flex h-20 w-full items-center justify-between px-6 lg:px-8">
        
        {/* Lado Esquerdo: Logo Aumentado + Navegação */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center">
            <img src="/logo.png" alt="Charlie Logo" className="h-14 w-auto object-contain" />
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

        {/* Lado Direito: Informações do Usuário no extremo direito */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r pr-4">
            <UserAvatar name={displayName(profile)} src={profile.avatar_url} className="h-9 w-9" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-none text-slate-900">{displayName(profile)}</p>
              <div className="mt-1"><RoleBadge role={profile.role} /></div>
            </div>
          </div>

          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" className="text-slate-500 hover:text-red-600 gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </form>
        </div>

      </div>

      {/* Navegação Mobile */}
      <nav className="flex md:hidden border-t px-4 py-2 overflow-x-auto gap-1 bg-slate-50">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                active ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-200"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}