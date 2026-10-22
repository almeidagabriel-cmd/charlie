"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/** Exibe aviso quando o middleware redireciona com ?acesso=negado. */
export function AccessDeniedToast({ show }: { show: boolean }) {
  useEffect(() => {
    if (show) toast.error("Acesso negado", { description: "Seu perfil não tem permissão para acessar essa página." });
  }, [show]);
  return null;
}
