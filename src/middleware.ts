import { createMiddlewareClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient(request);

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/profile", "/auth/update-password"];

  // Auth routes that should redirect if already authenticated
  const authRoutes = ["/auth/signin", "/auth/signup", "/auth/forgot-password"];

  // Public auth routes that don't need redirection
  const publicAuthRoutes = [
    "/auth/callback",
    "/auth/confirm",
    "/auth/auth-code-error",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  const isPublicAuthRoute = publicAuthRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Skip middleware for public auth routes
  if (isPublicAuthRoute) {
    return response;
  }

  // Redirect to sign in if accessing protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/auth/signin", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if accessing auth routes while authenticated
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
