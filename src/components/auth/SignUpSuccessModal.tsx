"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

interface SignUpSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export default function SignUpSuccessModal({
  isOpen,
  onClose,
  email,
}: SignUpSuccessModalProps) {
  const router = useRouter();

  if (!isOpen) return null;



  const handleClose = () => {
    onClose();
    router.push("/auth/signin");
  };

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

        <h1 className="text-3xl font-bold text-white mb-4">Almost there!</h1>

        <p className="text-gray-300 mb-6">
          We&apos;ve sent a confirmation link to{" "}
          <strong className="text-[#6bdcc0]">{email}</strong>.
        </p>
        <p className="text-gray-400 mb-4">
          Please check your inbox (and your spam folder!) and click the link to
          activate your account.
        </p>
        
        <div className="bg-[#6bdcc0]/10 border border-[#6bdcc0]/30 rounded-lg p-4 mb-8">
          <p className="text-[#6bdcc0] text-sm font-medium mb-2">
            📋 Access Your Dashboard
          </p>
          <p className="text-gray-300 text-sm">
            Once verified, sign in to view all your bookings, manage appointments, and access meeting links in one convenient dashboard.
          </p>
        </div>

        <div className="flex justify-center">
          <Button onClick={handleClose} variant="secondary">
            Continue to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
