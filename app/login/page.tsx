import type { Metadata } from "next";
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
    <div className="grid min-h-screen lg:grid-cols-2 bg-white">
      {/* Lado Esquerdo - Fundo branco com Logo */}
      <div className="hidden flex-col items-center justify-between border-r border-gray-100 bg-white p-10 lg:flex">
        {/* Espaçador invisível no topo para manter o logo perfeitamente centrado */}
        <div /> 
        
        <div className="flex flex-col items-center justify-center">
          <img 
            src="/logo.png" 
            alt="Charlie Gerenciamento de Tarefas" 
            className="w-72 object-contain" 
          />
        </div>
        
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Charlie</p>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo exibido apenas em ecrãs pequenos (telemóveis) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <img 
              src="/logo.png" 
              alt="Charlie" 
              className="h-16 object-contain" 
            />
          </div>
          
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Entrar</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Use seu e-mail corporativo e senha.</p>
          
          <LoginForm redirectTo={searchParams.redirectTo} initialError={initialError} />
        </div>
      </div>
    </div>
  );
}