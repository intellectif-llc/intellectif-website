"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BookingData } from "@/app/booking/page";
import PaymentForm from "./PaymentForm";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface PaymentStepProps {
  bookingData: BookingData;
  onPrevious: () => void;
}

export default function PaymentStep({
  bookingData,
  onPrevious,
}: PaymentStepProps) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string>("");
  // Removed unused bookingId state since payment success redirects to thank you page
  const router = useRouter();

  const createBookingAndPaymentIntent = useCallback(async () => {
    setIsLoading(true);
    setPaymentError("");

    try {
      // For paid services, create payment intent first (no booking yet)
      // The booking will be created after successful payment via webhook
      console.log("Creating payment intent for paid service...");

      const paymentResponse = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: bookingData.service!.id,
          customerEmail: bookingData.customer!.email,
          customerName: `${bookingData.customer!.firstName} ${bookingData.customer!.lastName}`,
          // Store booking data in payment intent metadata for webhook processing
          bookingData: {
            scheduledDate: bookingData.dateTime!.date,
            scheduledTime: bookingData.dateTime!.time,
            customerData: {
              email: bookingData.customer!.email,
              firstName: bookingData.customer!.firstName,
              lastName: bookingData.customer!.lastName,
              phone: bookingData.customer!.phone,
              company: bookingData.customer!.company,
            },
            projectDescription: bookingData.customer!.projectDescription,
          },
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error("Failed to create payment intent");
      }

      const paymentResult = await paymentResponse.json();
      setClientSecret(paymentResult.clientSecret);

      console.log(
        "Payment intent created successfully:",
        paymentResult.paymentIntentId
      );
    } catch (error) {
      console.error("Error creating payment intent:", error);
      setPaymentError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      toast.error("Failed to initialize payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [bookingData.service, bookingData.dateTime, bookingData.customer]);

  // Create booking and payment intent when component mounts
  useEffect(() => {
    if (bookingData.service && bookingData.dateTime && bookingData.customer) {
      createBookingAndPaymentIntent();
    }
  }, [
    bookingData.service,
    bookingData.dateTime,
    bookingData.customer,
    createBookingAndPaymentIntent,
  ]);

  const handlePaymentSuccess = () => {
    toast.success("Payment successful! Your booking has been confirmed.");
    setTimeout(() => {
      // Redirect to payment success page
      router.push("/booking/payment-success");
    }, 1500);
  };

  const handlePaymentError = (error: string) => {
    setPaymentError(error);
    toast.error(error);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0] mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Preparing Payment
            </h3>
            <p className="text-gray-300">
              Setting up your booking and payment details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (paymentError && !clientSecret) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20 shadow-xl">
          <div className="text-center">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Payment Setup Failed
            </h3>
            <p className="text-gray-300 mb-6">{paymentError}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={onPrevious} variant="secondary">
                Go Back
              </Button>
              <Button onClick={createBookingAndPaymentIntent}>Try Again</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Booking Summary */}
      <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">
          Booking Summary
        </h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex justify-between">
            <span>Service:</span>
            <span className="text-white font-medium">
              {bookingData.service?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time:</span>
            <span className="text-white font-medium">
              {bookingData.dateTime?.date} at {bookingData.dateTime?.time}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="text-white font-medium">
              {bookingData.service?.duration} minutes
            </span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="text-white font-medium">
              {bookingData.customer?.firstName} {bookingData.customer?.lastName}
            </span>
          </div>
          <hr className="border-gray-600" />
          <div className="flex justify-between text-lg font-semibold">
            <span className="text-white">Total:</span>
            <span className="text-[#6bdcc0]">
              ${bookingData.service?.price.toFixed(2)} USD
            </span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      {clientSecret && (
        <PaymentForm
          clientSecret={clientSecret}
          amount={bookingData.service?.price || 0}
          serviceName={bookingData.service?.name || ""}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button onClick={onPrevious} variant="secondary">
          Back to Details
        </Button>
      </div>
    </div>
  );
}
