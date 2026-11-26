import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Toutes les pages demandent d'être connecté avec l'adresse autorisée (ALLOWED_EMAIL).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const allowed = (process.env.ALLOWED_EMAIL ?? "").toLowerCase();
  const ok = !!user && (!allowed || user.email?.toLowerCase() === allowed);

  if (!ok && !isLogin) {
    if (user) await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = user ? "?refuse=1" : "";
    return NextResponse.redirect(url);
  }
  if (ok && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Exclus : fichiers techniques, API (vérifiées une par une), icônes et manifeste de l'appli
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|manifest.webmanifest|sw.js|.*\\.(?:png|webp)$).*)"],
};
