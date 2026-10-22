import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UsersManager } from "@/components/users/users-manager";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  // Defesa em profundidade: o middleware já bloqueia não-admins.
  const me = await requireProfile(["admin"]);

  const { data, error } = await createClient()
    .from("profiles")
    .select("*")
    .order("full_name")
    .returns<Profile[]>();
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader
        title="Gestão de Usuários"
        description="Cadastre colaboradores, defina níveis de acesso e gerencie o status das contas."
      />
      <UsersManager users={data ?? []} currentUserId={me.id} />
    </>
  );
}
