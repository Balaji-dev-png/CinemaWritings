/**
 * Next.js 16 Proxy — Supabase SSR Route Protection
 *
 * In Next.js 16, `middleware.ts` was renamed to `proxy.ts`
 * and the exported function changed from `middleware` to `proxy`.
 *
 * Protects /editor, /directors-suite, and /dashboard routes.
 * Uses @supabase/ssr to read the session from cookies and call
 * getUser() (server-validated) — never trusts client-side state alone.
 *
 * ref: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/editor", "/directors-suite", "/dashboard", "/storyboard"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Only run auth check on protected routes
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (!isProtected) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Env vars missing — fail open in dev, fail closed in prod
    if (process.env.NODE_ENV === "production") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // ALWAYS use getUser() — not getSession() — as it validates with the server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/editor/:path*",
    "/directors-suite/:path*",
    "/dashboard/:path*",
    "/storyboard/:path*",
  ],
};
