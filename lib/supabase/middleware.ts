import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessRoute, isPublicRoute } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

/**
 * Renova a sessão (cookies), protege rotas e verifica o cargo do usuário.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // IMPORTANTE: getUser() valida o JWT no servidor do Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const redirect = NextResponse.redirect(url);
    // preserva cookies de sessão renovados
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (isPublicRoute(pathname)) {
    if (user && pathname === "/login") return redirectTo("/dashboard");
    return response;
  }

  if (!user) {
    return redirectTo("/login", { redirectTo: pathname + search });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single<{ role: UserRole; is_active: boolean }>();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return redirectTo("/login", { error: "inactive" });
  }

  if (!canAccessRoute(profile.role, pathname)) {
    return redirectTo("/dashboard", { acesso: "negado" });
  }

  return response;
}
