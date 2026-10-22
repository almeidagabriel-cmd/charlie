import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar | Charlie" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string };
}) {
  const initialError =
    searchParams.error === "inactive"
      ? "Sua conta está desativada. Procure um administrador."
      : searchParams.error === "link"
        ? "Link inválido ou expirado. Solicite um novo."
        : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel Esquerdo (Desktop) - Fundo Branco com Logo Bem Grande e Centralizada */}
      <div className="relative hidden flex-col items-center justify-between bg-white p-12 lg:flex border-r border-slate-100">
        <div /> {/* Espaçamento superior */}
        
        {/* Logo com tamanho máximo expandido */}
        <div className="flex flex-col items-center justify-center w-full max-w-lg px-6">
          <img 
            src="/logo.png" 
            alt="Charlie Logo" 
            className="w-full max-h-[60vh] object-contain" 
          />
        </div>

        <p className="text-sm text-slate-400">© {new Date().getFullYear()} Charlie</p>
      </div>

      {/* Formulário Direito */}
      <div className="flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo exibida em telas Mobile */}
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <img src="/logo.png" alt="Charlie Logo" className="h-24 w-auto object-contain" />
          </div>
          
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Entrar</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Use seu e-mail corporativo e senha.</p>
          <LoginForm redirectTo={searchParams.redirectTo} initialError={initialError} />
        </div>
      </div>
    </div>
  );
}