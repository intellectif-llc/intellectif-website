"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset messages
    setError("");
    setSuccess("");

    // Validation
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Check your email for a password reset link!");
        setEmail("");
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _unused = error;
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#051028] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold gradient-text">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Enter your email address and we&apos;ll send you a link to reset
            your password
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[#051028] bg-opacity-80
                  border border-[#6bdcc0]/30
                  text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                  transition-all duration-300
                "
                placeholder="Enter your email"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
            </Button>
          </form>

          {/* Back to Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Remember your password?{" "}
              <Link
                href="/auth/signin"
                className="text-[#6bdcc0] hover:text-[#22d3ee] font-medium transition-colors duration-300"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
