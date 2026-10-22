import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "Definir nova senha" };

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Definir nova senha</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Escolha uma senha com pelo menos 8 caracteres.</p>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
