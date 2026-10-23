import { createServerClient } from "@supabase/ssr"; // ou o seu helper de Supabase Server
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Task } from "@/lib/types";

export default async function PlanejamentoPage() {
  const cookieStore = await cookies();

  // 1. Inicializar cliente Supabase no Servidor
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // 2. Verificar o utilizador autenticado
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 3. Buscar o perfil para validar a role (UserRole)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role;

  // 4. Bloqueio estrito: Colaboradores ('member') não têm acesso ao planeamento
  if (userRole === "member") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center p-4">
        <div className="rounded-full bg-amber-50 p-4 mb-4 text-amber-600">
          🔒
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="mt-2 text-slate-500 max-w-md">
          O módulo de planeamento de tarefas e projetos é exclusivo para Gestores e Diretores.
        </p>
      </div>
    );
  }

  // 5. Buscar as tarefas do banco de dados (apenas para Gestores/Diretores/Admins)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("position", { ascending: true });

  return (
    <div className="flex h-full flex-col p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Planeamento & Projetos</h1>
        <p className="text-sm text-slate-500">
          Quadro Kanban e controlo de prazos
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialTasks={(tasks as Task[]) || []} />
      </div>
    </div>
  );
}