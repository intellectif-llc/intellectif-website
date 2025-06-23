"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");
  const [bookingDetails, setBookingDetails] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookingDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setBookingDetails(data);
      }
    } catch (error) {
      console.error("Failed to fetch booking details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId, fetchBookingDetails]);

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
              <p className="text-gray-300">Loading booking details...</p>
            </div>
          ) : (
            <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white"
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
                Booking Confirmed!
              </h1>

              <p className="text-gray-300 mb-8">
                Thank you for your booking. We&apos;ve sent a confirmation email
                with all the details.
              </p>

              {bookingDetails && (
                <div className="bg-[#0f172a] rounded-xl p-6 mb-8 text-left">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Booking Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reference:</span>
                      <span className="text-white font-mono">
                        {bookingDetails.booking_reference as string}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service:</span>
                      <span className="text-white">
                        {(bookingDetails.service as { name?: string })?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date & Time:</span>
                      <span className="text-white">
                        {bookingDetails.scheduled_date as string} at{" "}
                        {bookingDetails.scheduled_time as string}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-green-400 capitalize">
                        {bookingDetails.status as string}
                      </span>
                    </div>
                    {bookingDetails.payment_status !== "waived" && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment:</span>
                        <span className="text-green-400 capitalize">
                          {bookingDetails.payment_status as string}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  You&apos;ll receive meeting details closer to the appointment
                  date.
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

export default function BookingSuccessPage() {
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
      <BookingSuccessContent />
    </Suspense>
  );
}
