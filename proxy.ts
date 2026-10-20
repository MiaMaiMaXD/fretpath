import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { safeNextPath } from "@/lib/safe-next";

const PROTECTED = ["/dashboard", "/path", "/lessons", "/practice", "/profile", "/reset-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isGuestOnly = pathname === "/login" || pathname === "/signup";

  let target: URL | null = null;
  if (!user && (isProtected || isAdminPath)) {
    target = new URL("/login", request.url);
    target.searchParams.set("next", pathname + search);
  } else if (user && isAdminPath) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) target = new URL("/dashboard", request.url);
  } else if (user && isGuestOnly) {
    target = new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url);
  }
  if (target) {
    const redirect = NextResponse.redirect(target);
    // Keep any refreshed session cookies Supabase set on the pass-through response.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
