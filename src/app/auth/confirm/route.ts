import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    console.log("Attempting verifyOtp with:", { type, token_hash });

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      console.log("Email verification successful!");
      redirectTo.searchParams.delete("token_hash");
      redirectTo.searchParams.delete("type");
      redirectTo.searchParams.delete("next");
      return NextResponse.redirect(redirectTo);
    }

    console.error("Email verification error:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __isAuthError: (error as any).__isAuthError,
    });
  } else {
    console.log("Missing required parameters - redirecting to error page");
    console.log("token_hash present:", !!token_hash);
    console.log("type present:", !!type);
  }

  // Redirect to error page if something went wrong
  redirectTo.pathname = "/auth/auth-code-error";
  redirectTo.searchParams.set("error", "missing_parameters");
  console.log("Redirecting to error page:", redirectTo.toString());
  return NextResponse.redirect(redirectTo);
}
