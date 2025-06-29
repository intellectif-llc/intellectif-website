import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { BookingData } from "@/app/booking/page";
import "react-international-phone/style.css";
import { useTurnstile } from "@/hooks/useTurnstile";
import Turnstile, { type TurnstileRef } from "@/components/ui/Turnstile";
import { PhoneInput } from "react-international-phone";
import Button from "../ui/Button";
import {
  useCreateBooking,
  useOptimisticTimeSlots,
} from "@/hooks/useBookingData";

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  projectDescription: string;
}

interface CustomerInformationProps {
  customerData: CustomerData | null;
  onCustomerDataUpdate: (data: CustomerData) => void;
  onPrevious: () => void;
  onNext?: () => void; // Add onNext for paid services
  bookingData: BookingData;
}

export default function CustomerInformation({
  customerData,
  onCustomerDataUpdate,
  onPrevious,
  onNext,
  bookingData,
}: CustomerInformationProps) {
  const [localCustomerData, setLocalCustomerData] = useState<CustomerData>(
    customerData || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      projectDescription: "",
    }
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileRef = useRef<TurnstileRef>(null);

  const createBookingMutation = useCreateBooking();

  // Turnstile hook
  const {
    isVerified,
    isLoading: isTurnstileLoading,
    error: turnstileError,
    handleSuccess,
    handleError,
    handleExpire,
    reset: resetTurnstile,
  } = useTurnstile();

  // Reset turnstile if the service changes (e.g. user goes back and picks a new one)
  useEffect(() => {
    resetTurnstile();
    turnstileRef.current?.reset();
  }, [bookingData.service?.id, resetTurnstile]);

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setLocalCustomerData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    return true;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!localCustomerData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!localCustomerData.lastName.trim())
      newErrors.lastName = "Last name is required";
    if (!localCustomerData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(localCustomerData.email))
      newErrors.email = "Email is invalid";
    if (!localCustomerData.phone.trim())
      newErrors.phone = "Phone number is required";
    if (!localCustomerData.company.trim())
      newErrors.company = "Company name is required";
    if (!localCustomerData.projectDescription.trim())
      newErrors.projectDescription = "Project description is required";

    setFormErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // Clear the main form error if all individual errors are resolved
      setFormErrors({});
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    if (!isVerified) {
      toast.error("Please complete the security verification to continue.");
      return;
    }

    onCustomerDataUpdate(localCustomerData);

    // If service requires payment, proceed to the payment step
    if (bookingData.service?.requiresPayment) {
      if (onNext) {
        onNext();
      }
      return;
    }

    // This is a FREE booking, so create it directly.
    if (!bookingData.service || !bookingData.dateTime) {
      toast.error(
        "Missing service or date/time information. Please go back and complete the previous steps."
      );
      return;
    }

    createBookingMutation.mutate({
      serviceId: bookingData.service.id,
      scheduledDate: bookingData.dateTime.date,
      scheduledTime: bookingData.dateTime.time,
      customerData: {
        email: localCustomerData.email,
        firstName: localCustomerData.firstName,
        lastName: localCustomerData.lastName,
        phone: localCustomerData.phone,
        company: localCustomerData.company,
      },
      projectDescription: localCustomerData.projectDescription,
    });
  };

  const isNextDisabled =
    createBookingMutation.isPending || isTurnstileLoading || !isVerified;

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Complete Your Booking
        </h2>
        <p className="text-lg text-[#64748b] max-w-2xl mx-auto">
          Please provide your information to confirm your consultation
          appointment.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Customer Information Form */}
        <div className="lg:col-span-2">
          <div
            className="p-8 rounded-2xl"
            style={{
              background: "rgba(30, 41, 59, 0.4)",
              border: "2px solid rgba(107, 220, 192, 0.2)",
              boxShadow: "0 8px 32px rgba(107, 220, 192, 0.1)",
            }}
          >
            <h3 className="text-2xl font-bold text-white mb-8 flex items-center">
              <svg
                className="w-6 h-6 text-[#6bdcc0] mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Your Information
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={localCustomerData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    formErrors.firstName
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="Enter your first name"
                />
                {formErrors.firstName && (
                  <p className="text-red-400 text-sm mt-2">
                    {formErrors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={localCustomerData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    formErrors.lastName
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="Enter your last name"
                />
                {formErrors.lastName && (
                  <p className="text-red-400 text-sm mt-2">
                    {formErrors.lastName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={localCustomerData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    formErrors.email
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="your.email@company.com"
                />
                {formErrors.email && (
                  <p className="text-red-400 text-sm mt-2">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Phone Number *
                </label>
                <PhoneInput
                  defaultCountry="us"
                  value={localCustomerData.phone}
                  onChange={(value) => handleInputChange("phone", value)}
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    formErrors.phone
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="+1 (555) 123-4567"
                />
                {formErrors.phone && (
                  <p className="text-red-400 text-sm mt-2">
                    {formErrors.phone}
                  </p>
                )}
              </div>

              {/* Company */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={localCustomerData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    formErrors.company
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="Your Company Name"
                />
                {formErrors.company && (
                  <p className="text-red-400 text-sm mt-2">
                    {formErrors.company}
                  </p>
                )}
              </div>

              {/* Project Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Project Description *
                </label>
                <textarea
                  value={localCustomerData.projectDescription}
                  onChange={(e) =>
                    handleInputChange("projectDescription", e.target.value)
                  }
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 resize-none ${
                    formErrors.projectDescription
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="Please describe your project, goals, and what you're looking to achieve..."
                />
                {formErrors.projectDescription && (
                  <p className="text-red-400 text-sm mt-2">
                    {formErrors.projectDescription}
                  </p>
                )}
              </div>

              {/* Turnstile Integration */}
              <div className="md:col-span-2 flex justify-center py-4">
                <Turnstile
                  ref={turnstileRef}
                  onSuccess={handleSuccess}
                  onError={handleError}
                  onExpire={handleExpire}
                />
              </div>
              {turnstileError && (
                <div className="md:col-span-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm text-center">
                    {turnstileError}
                  </p>
                </div>
              )}

              {/* Success confirmation */}
              {isVerified && (
                <div className="md:col-span-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 text-sm text-center flex items-center justify-center">
                    <svg
                      className="w-4 h-4 mr-2"
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
                    Security verification completed
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <div
            className="p-8 rounded-2xl sticky top-8"
            style={{
              background:
                "linear-gradient(135deg, rgba(107, 220, 192, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)",
              border: "2px solid rgba(107, 220, 192, 0.3)",
              boxShadow: "0 8px 32px rgba(107, 220, 192, 0.2)",
            }}
          >
            <h3 className="text-2xl font-bold text-[#6bdcc0] mb-6">
              Booking Summary
            </h3>

            {/* Service Details */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">Service</h4>
              <div className="space-y-2">
                <p className="text-[#64748b]">{bookingData.service?.name}</p>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Duration:</span>
                  <span className="text-white">
                    {bookingData.service?.duration} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Price:</span>
                  <span className="text-[#6bdcc0] font-bold">
                    {bookingData.service?.price === 0
                      ? "Free"
                      : `$${bookingData.service?.price}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">
                Date & Time
              </h4>
              <div className="space-y-2">
                <p className="text-[#64748b]">
                  {bookingData.dateTime?.date &&
                    new Date(
                      bookingData.dateTime.date + "T00:00:00"
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                </p>
                <p className="text-white font-semibold">
                  {bookingData.dateTime?.time &&
                    new Date(
                      `2000-01-01T${bookingData.dateTime.time}`
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-[#64748b]/30 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-white">Total:</span>
                <span className="text-2xl font-bold text-[#6bdcc0]">
                  {bookingData.service?.price === 0
                    ? "Free"
                    : `$${bookingData.service?.price}`}
                </span>
              </div>
              {bookingData.service?.price === 0 && (
                <p className="text-sm text-[#64748b] mt-2">
                  No payment required for this consultation
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6">
        <Button onClick={onPrevious} variant="outline">
          Previous
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isNextDisabled}
          isLoading={createBookingMutation.isPending}
        >
          {createBookingMutation.isPending
            ? "Confirming..."
            : bookingData.service?.requiresPayment
            ? "Next: Payment"
            : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );
}
