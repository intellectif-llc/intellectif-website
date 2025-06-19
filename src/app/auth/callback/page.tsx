"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase";

function AuthCallbackContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if this is a token_hash based confirmation (new flow)
        const token_hash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (token_hash && type) {
          // Redirect to the new confirm endpoint
          const next = searchParams.get("next") || "/dashboard";
          router.replace(
            `/auth/confirm?token_hash=${token_hash}&type=${type}&next=${next}`
          );
          return;
        }

        // Legacy code-based flow (for OAuth, etc.)
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            setStatus("error");
            setMessage(error.message);

            // If it's the PKCE error, show helpful message
            if (
              error.message.includes(
                "both auth code and code verifier should be non-empty"
              )
            ) {
              setMessage(
                "This appears to be an email confirmation link. Please use the latest confirmation email sent to you, as this link format is no longer supported."
              );
            }
          } else {
            setStatus("success");
            setMessage("Successfully authenticated! Redirecting...");

            // Redirect to dashboard after a short delay
            setTimeout(() => {
              router.push("/dashboard");
            }, 2000);
          }
        } else {
          setStatus("error");
          setMessage("No authentication code found");
        }
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _unused = error;
        setStatus("error");
        setMessage("An unexpected error occurred");
      }
    };

    handleAuthCallback();
  }, [searchParams, supabase, router]);

  return (
    <div className="min-h-screen bg-[#051028] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold gradient-text">
            {status === "loading" && "Authenticating..."}
            {status === "success" && "Authentication Successful!"}
            {status === "error" && "Authentication Failed"}
          </h2>

          <div className="mt-8">
            {status === "loading" && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0]"></div>
              </div>
            )}

            {status === "success" && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex justify-center mb-4">
                  <svg
                    className="w-12 h-12 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-green-400 text-center">{message}</p>
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                <div className="flex justify-center mb-4">
                  <svg
                    className="w-12 h-12 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <p className="text-red-400 text-center mb-4">{message}</p>
                <div className="text-center space-y-2">
                  <button
                    onClick={() => router.push("/auth/signin")}
                    className="block w-full text-[#6bdcc0] hover:text-[#22d3ee] font-medium transition-colors duration-300"
                  >
                    Return to Sign In
                  </button>
                  <button
                    onClick={() => router.push("/auth/signup")}
                    className="block w-full text-gray-400 hover:text-gray-200 text-sm transition-colors duration-300"
                  >
                    Try Signing Up Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#051028] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0]"></div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
