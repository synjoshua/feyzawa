import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * PKCE magic-link callback. Cookies must be written onto the *redirect*
 * response — otherwise the session is dropped and middleware sends you
 * straight back to /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/tracker";
  const next = nextParam.startsWith("/") ? nextParam : "/tracker";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin =
    process.env.NODE_ENV === "development"
      ? new URL(request.url).origin
      : forwardedHost
        ? `${proto}://${forwardedHost}`
        : new URL(request.url).origin;

  const successUrl = `${origin}${next}`;
  const errorUrl = `${origin}/login?error=auth_callback`;

  if (!code) {
    return NextResponse.redirect(errorUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(errorUrl);
  }

  let response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(successUrl);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth/callback exchange failed", error.message);
    return NextResponse.redirect(errorUrl);
  }

  return response;
}
