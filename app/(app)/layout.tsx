import { Sidebar } from "@/components/layout/sidebar";
import { requireProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Busca o perfil REAL (cargo vindo do banco). Redireciona para /login se não houver sessão.
  const profile = await requireProfile();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar profile={profile} />
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
