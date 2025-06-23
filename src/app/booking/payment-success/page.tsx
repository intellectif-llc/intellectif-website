"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  // Payment details state removed as it's not currently used
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get payment intent ID from URL params or session storage
    const urlPaymentId = searchParams.get("payment_intent");
    const sessionPaymentId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("payment_intent_id")
        : null;

    const finalPaymentId = urlPaymentId || sessionPaymentId;
    setPaymentIntentId(finalPaymentId);

    // Clear session storage after use
    if (typeof window !== "undefined" && sessionPaymentId) {
      sessionStorage.removeItem("payment_intent_id");
    }

    // Set a timeout to show success message
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#051028] pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6bdcc0] opacity-5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0ea5e9] opacity-5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          {isLoading ? (
            <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0] mx-auto mb-4"></div>
              <p className="text-gray-300">Processing your payment...</p>
            </div>
          ) : (
            <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-[#6bdcc0] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-white"
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

              <h1 className="text-3xl font-bold text-white mb-4">
                Payment Successful! 🎉
              </h1>

              <p className="text-gray-300 mb-6">
                Thank you for your payment. Your consultation has been booked
                and confirmed.
              </p>

              <div className="bg-[#0f172a] rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  What Happens Next?
                </h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#6bdcc0] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-black text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">
                        Confirmation Email
                      </h4>
                      <p className="text-gray-400 text-sm">
                        You&apos;ll receive a detailed confirmation email with
                        your booking reference and meeting details.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#6bdcc0] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-black text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">
                        Meeting Preparation
                      </h4>
                      <p className="text-gray-400 text-sm">
                        We&apos;ll send you a preparation guide 24 hours before
                        your consultation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#6bdcc0] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-black text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">
                        Your Consultation
                      </h4>
                      <p className="text-gray-400 text-sm">
                        Join your scheduled meeting via the Google Meet link
                        provided in your confirmation email.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {paymentIntentId && (
                <div className="bg-[#0f172a] rounded-xl p-4 mb-6">
                  <p className="text-xs text-gray-500 mb-1">
                    Payment Reference:
                  </p>
                  <p className="text-white font-mono text-sm">
                    {paymentIntentId}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Need help? Contact us at{" "}
                  <a
                    href="mailto:admin@intellectif.com"
                    className="text-[#6bdcc0] hover:underline"
                  >
                    admin@intellectif.com
                  </a>
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/">
                    <Button variant="secondary">Back to Home</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button>View Dashboard</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#051028] pt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0] mx-auto mb-4"></div>
                <p className="text-gray-300">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
