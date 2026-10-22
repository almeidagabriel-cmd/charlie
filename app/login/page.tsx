import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage(props: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const initialError =
    searchParams.error === "inactive"
      ? "Sua conta está desativada. Procure um administrador."
      : searchParams.error === "link"
        ? "Link inválido ou expirado. Solicite um novo."
        : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <LayoutGrid className="h-6 w-6" /> Charlie
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">
            Projetos, tarefas e produtividade
            <br /> da equipe em um só lugar.
          </h2>
          <p className="max-w-md text-indigo-100">
            Kanban em tempo real, progresso ponderado por complexidade e relatórios de entrega por colaborador.
          </p>
        </div>
        <p className="text-sm text-indigo-200">© {new Date().getFullYear()} Charlie</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden">
            <LayoutGrid className="h-6 w-6 text-primary" /> Charlie
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Use seu e-mail corporativo e senha.</p>
          <LoginForm redirectTo={searchParams.redirectTo} initialError={initialError} />
        </div>
      </div>
    </div>
  );
}
