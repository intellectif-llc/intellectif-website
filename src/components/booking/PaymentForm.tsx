"use client";

import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  serviceName: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function PaymentFormInner({
  amount,
  serviceName,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError("Stripe has not loaded yet. Please try again.");
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("Payment failed:", error);
        onError(error.message || "Payment failed. Please try again.");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("Payment succeeded:", paymentIntent.id);

        // Store payment intent ID for the success page
        if (typeof window !== "undefined") {
          sessionStorage.setItem("payment_intent_id", paymentIntent.id);
        }

        toast.success("Payment successful!");
        onSuccess();
      }
    } catch (err) {
      console.error("Payment error:", err);
      onError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Complete Payment
          </h3>
          <div className="text-[#6bdcc0] text-lg font-medium">
            ${amount.toFixed(2)} USD
          </div>
          <div className="text-gray-300 text-sm mt-1">{serviceName}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="payment-element-container">
            <PaymentElement
              options={{
                layout: "tabs",
                paymentMethodOrder: ["card"],
              }}
            />
          </div>

          <Button
            type="submit"
            disabled={!stripe || !elements || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              `Pay $${amount.toFixed(2)}`
            )}
          </Button>

          <div className="text-xs text-gray-400 text-center">
            Your payment is secured by Stripe. We do not store your card
            details.
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  const [stripePromise] = useState(() => {
    try {
      return getStripe();
    } catch (error) {
      console.error("Failed to initialize Stripe:", error);
      return null;
    }
  });

  const options = {
    clientSecret: props.clientSecret,
    appearance: {
      theme: "night" as const,
      variables: {
        colorPrimary: "#6bdcc0",
        colorBackground: "#1e293b",
        colorText: "#ffffff",
        colorDanger: "#ef4444",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "8px",
      },
    },
  };

  if (!stripePromise) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20 shadow-xl">
          <div className="text-center">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Payment System Unavailable
            </h3>
            <p className="text-gray-300 mb-4">
              Unable to load payment system. Please check your configuration.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner {...props} />
    </Elements>
  );
}
