"use client";

// Import Link for semantic navigation
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#051028] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto text-center">
        {/* 404 Number */}
        <h1 className="text-8xl sm:text-9xl font-bold gradient-text mb-6">
          404
        </h1>

        {/* Error Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-300 mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          {/* UPDATED: Button is wrapped in a Link component */}
          <Link href="/" passHref>
            <Button size="lg" className="w-full sm:w-auto">
              Go Home
            </Button>
          </Link>

          {/* NO CHANGE: This is perfectly fine for going back */}
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-6 py-3 text-[#6bdcc0] border border-[#6bdcc0]/30 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
