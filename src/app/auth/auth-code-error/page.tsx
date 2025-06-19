"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-[#051028] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold gradient-text">
            Authentication Failed
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            The authentication link has expired or is invalid
          </p>
        </div>

        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20 shadow-xl">
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
            <div className="text-center">
              <h3 className="text-lg font-medium text-red-400 mb-2">
                Verification Failed
              </h3>
              <p className="text-red-300 text-sm mb-6">This could happen if:</p>
              <ul className="text-red-300 text-sm text-left space-y-1 mb-6">
                <li>• The link has expired (links expire after 1 hour)</li>
                <li>• The link has already been used</li>
                <li>• The link was corrupted during forwarding</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Link href="/auth/signup">
              <Button variant="primary" size="lg" className="w-full">
                Try Signing Up Again
              </Button>
            </Link>

            <Link href="/auth/forgot-password">
              <Button variant="outline" size="lg" className="w-full">
                Reset Password Instead
              </Button>
            </Link>

            <div className="text-center">
              <Link
                href="/auth/signin"
                className="text-[#6bdcc0] hover:text-[#22d3ee] font-medium transition-colors duration-300"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
