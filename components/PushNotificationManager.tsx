"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Chave pública VAPID (você precisará gerar um par de chaves VAPID para produção)
// Para testes locais, pode usar uma gerada online ou via web-push
const publicVapidKey = "BC4gBt4IaWe6ijueLB3mzLu1uEKDjiZ3iLcA_iKzRcYd4NgVp0Timjh-nfaMDMxTk23UXaGfGUTvOJeTeShXeCY";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);

      // Se o navegador ainda não tem permissão concedida ou negada, mostra o pop-up
      if (!sub && Notification.permission === "default") {
        setShowPrompt(true);
      }
    } catch (error) {
      console.error("Erro ao registrar Service Worker:", error);
    }
  }

  async function subscribeUser() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      setSubscription(sub);
      setShowPrompt(false);

      // Salvar no Supabase
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from("push_subscriptions").upsert({
          user_id: userData.user.id,
          subscription: sub.toJSON(),
        }, { onConflict: 'user_id' });
      }

      toast.success("Notificações push ativadas com sucesso!");
    } catch (error) {
      console.error("Erro ao se inscrever nas notificações:", error);
      toast.error("Não foi possível ativar as notificações.");
    }
  }

  if (!isSupported || !showPrompt || subscription) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900">Ativar notificações push?</h4>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Receba alertas de novas mensagens, demandas e tarefas mesmo com o app fechado.
          </p>
        </div>
        <button 
          onClick={() => setShowPrompt(false)} 
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={() => setShowPrompt(false)}
          className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Agora não
        </button>
        <button
          onClick={subscribeUser}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          Ativar
        </button>
      </div>
    </div>
  );
}