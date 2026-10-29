import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  "mailto:contato@grupoba.com", // O seu e-mail de contacto
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, title, message, url } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "UserID não informado" }, { status: 400 });
    }

    const supabase = await createClient();

    // Buscar a assinatura push salva no banco para este utilizador
    const { data: subData, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .single();

    if (error || !subData) {
      return NextResponse.json({ error: "Inscrição push não encontrada para o utilizador" }, { status: 404 });
    }

    const pushSubscription = subData.subscription;
    const payload = JSON.stringify({ title, message, url: url || "/checklist" });

    // Enviar a notificação
    await webpush.sendNotification(pushSubscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao enviar push notification:", error);
    
    // Se a assinatura expirou ou for inválida
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log("Assinatura expirada ou inválida.");
    }

    return NextResponse.json({ error: "Falha ao enviar notificação" }, { status: 500 });
  }
}