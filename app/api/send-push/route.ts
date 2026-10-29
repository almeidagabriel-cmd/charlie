// app/api/send-push/route.ts
import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // web-push precisa do crypto do Node
export const dynamic = "force-dynamic";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const notificationId: string | undefined = body?.notificationId;

    console.log("[send-push] chamada recebida", { notificationId });

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId é obrigatório" }, { status: 400 });
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!publicKey || !privateKey || !serviceRole || !supabaseUrl) {
      console.error("[send-push] variáveis de ambiente em falta");
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@exemplo.com",
      publicKey,
      privateKey
    );

    // Usa o cliente admin para ignorar RLS e ler a notificação com segurança absoluta
    const admin = createAdminClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const { data: notif, error: notifError } = await admin
      .from("notifications")
      .select("id, user_id, title, message")
      .eq("id", notificationId)
      .single();

    if (notifError || !notif) {
      console.error("[send-push] notificação não encontrada", notifError);
      return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
    }

    // Busca as subscrições push do destinatário da notificação
    const { data: subs, error: subsError } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", notif.user_id);

    if (subsError) {
      console.error("[send-push] erro ao ler subscrições", subsError);
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      console.log("[send-push] destinatário sem subscrições", { userId: notif.user_id });
      return NextResponse.json({ sent: 0, reason: "destinatário sem subscrições" });
    }

    // Payload que o service worker vai ler no evento "push"
    const payload = JSON.stringify({
      title: notif.title,
      body: notif.message,
      url: "/checklist",
      tag: notif.id,
    });

    const results = await Promise.allSettled(
      (subs as PushSubscriptionRow[]).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 }
        )
      )
    );

    const expiredIds: string[] = [];
    let sent = 0;

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        sent++;
        return;
      }
      const statusCode = (r.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        expiredIds.push(subs[i].id);
      } else {
        console.error("[send-push] falha no envio", statusCode, (r.reason as Error)?.message);
      }
    });

    if (expiredIds.length) {
      await admin.from("push_subscriptions").delete().in("id", expiredIds);
    }

    console.log("[send-push] resultado com sucesso", { sent, total: subs.length, removed: expiredIds.length });

    return NextResponse.json({ sent, total: subs.length, removed: expiredIds.length });
  } catch (err: any) {
    console.error("[send-push] erro crítico inesperado:", err);
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 });
  }
}   