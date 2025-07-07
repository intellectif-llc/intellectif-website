"use client";

import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { TimezoneService } from "@/lib/timezone-service";

interface BookingDetails {
  booking_reference: string;
  service: { name?: string };
  scheduled_datetime: string;
  status: string;
  payment_status?: string;
}

interface BookingSuccessModalProps {
  isOpen: boolean;
  bookingDetails: BookingDetails | null;
}

export default function BookingSuccessModal({
  isOpen,
  bookingDetails,
}: BookingSuccessModalProps) {
  if (!isOpen || !bookingDetails) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div
        className="bg-[#1e293b] bg-opacity-80 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl max-w-lg w-full text-center transform transition-all animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
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
          Thank you for your booking. We&apos;ve sent a confirmation email with
          all the details.
        </p>

        <div className="bg-[#0f172a] rounded-xl p-6 mb-8 text-left">
          <h3 className="text-lg font-semibold text-white mb-4">
            Booking Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Reference:</span>
              <span className="text-white font-mono">
                {bookingDetails.booking_reference}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Service:</span>
              <span className="text-white">{bookingDetails.service?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Date & Time:</span>
              <span className="text-white">
                {TimezoneService.formatForEmail(
                  bookingDetails.scheduled_datetime
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-green-400 capitalize">
                {bookingDetails.status}
              </span>
            </div>
            {bookingDetails.payment_status &&
              bookingDetails.payment_status !== "waived" && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment:</span>
                  <span className="text-green-400 capitalize">
                    {bookingDetails.payment_status}
                  </span>
                </div>
              )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button variant="secondary">Back to Home</Button>
          </Link>
          <Link href="/dashboard">
            <Button>View My Bookings</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
