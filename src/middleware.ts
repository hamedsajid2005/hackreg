import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Refreshes the organizer auth session on every /organizer request and blocks
 * unauthenticated access to everything except the login page.
 * Authorisation (the organizer_users role check) happens again server-side in
 * the layout — middleware alone is never the gate.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        response.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/organizer/login";

  if (!user && !isLogin) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/organizer/login";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  if (user && isLogin) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/organizer";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: ["/organizer/:path*"],
};
