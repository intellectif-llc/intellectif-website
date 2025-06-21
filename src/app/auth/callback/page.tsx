"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus("loading");

        // Get the current URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (!code) {
          setStatus("error");
          setMessage("No authentication code found");
          return;
        }

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          code
        );

        if (error) {
          console.error("Auth error:", error);
          setStatus("error");
          setMessage(error.message);
          return;
        }

        if (data.user) {
          setStatus("success");
          setMessage("Successfully authenticated! Redirecting...");
          // Redirect to dashboard or intended page
          const redirectTo =
            url.searchParams.get("redirect_to") || "/dashboard";
          setTimeout(() => {
            router.push(redirectTo);
          }, 1000);
        }
      } catch (err) {
        console.error("Callback error:", err);
        setStatus("error");
        setMessage("Authentication failed. Please try again.");
      }
    };

    handleAuthCallback();
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen bg-[#051028] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold gradient-text">
            {status === "loading" && "Processing..."}
            {status === "success" && "Success!"}
            {status === "error" && "Authentication Error"}
          </h2>

          <div className="mt-8">
            {status === "loading" && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6bdcc0]"></div>
              </div>
            )}

            {status === "success" && (
              <div className="text-green-400">
                <svg
                  className="mx-auto h-12 w-12 mb-4"
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
            )}

            {status === "error" && (
              <div className="text-red-400">
                <svg
                  className="mx-auto h-12 w-12 mb-4"
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
            )}
          </div>

          {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}

          {status === "error" && (
            <div className="mt-6">
              <button
                onClick={() => router.push("/auth/signin")}
                className="text-[#6bdcc0] hover:text-[#22d3ee] font-medium transition-colors duration-300"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
