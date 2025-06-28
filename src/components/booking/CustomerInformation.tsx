import React, { useState } from "react";
import toast from "react-hot-toast";
import { BookingData } from "@/app/booking/page";
import Turnstile from "@/components/ui/Turnstile";
import { useTurnstile } from "@/hooks/useTurnstile";
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
  const [formData, setFormData] = useState<CustomerData>({
    firstName: customerData?.firstName || "",
    lastName: customerData?.lastName || "",
    email: customerData?.email || "",
    phone: customerData?.phone || "",
    company: customerData?.company || "",
    projectDescription: customerData?.projectDescription || "",
  });

  const [errors, setErrors] = useState<Partial<CustomerData>>({});

  // TanStack Query hooks
  const createBookingMutation = useCreateBooking();
  const { updateTimeSlotOptimistically } = useOptimisticTimeSlots(
    bookingData.dateTime?.date || "",
    bookingData.service?.id
  );

  // Turnstile hook
  const {
    token: _token,
    isVerified,
    isLoading: _isLoading,
    error: turnstileError,
    turnstileRef,
    handleSuccess: handleTurnstileSuccess,
    handleError: handleTurnstileError,
    handleExpire: handleTurnstileExpire,
    validateToken,
    reset: _resetTurnstile,
  } = useTurnstile();

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    onCustomerDataUpdate({ ...formData, [field]: value });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<CustomerData> = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.company.trim())
      newErrors.company = "Company name is required";
    if (!formData.projectDescription.trim())
      newErrors.projectDescription = "Project description is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Validate Turnstile first
    const isTurnstileValid = await validateToken();
    if (!isTurnstileValid) {
      return;
    }

    // Update customer data in parent component
    onCustomerDataUpdate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      projectDescription: formData.projectDescription,
    });

    // Check if this is a paid service
    const isPaidService =
      bookingData.service?.price && bookingData.service.price > 0;

    if (isPaidService) {
      // For paid services, proceed to payment step
      // The booking will be created after successful payment
      console.log("Paid service detected - proceeding to payment step");
      onNext?.(); // Call onNext to proceed to payment step
      return;
    }

    // For free services, create the booking immediately
    console.log("Free service detected - creating booking immediately");

    // Optimistically update the UI (reduce available slots)
    if (bookingData.dateTime?.time) {
      updateTimeSlotOptimistically(bookingData.dateTime.time, true);
    }

    // Use TanStack Query mutation for free bookings
    createBookingMutation.mutate(
      {
        serviceId: bookingData.service?.id || "",
        scheduledDate: bookingData.dateTime?.date || "",
        scheduledTime: bookingData.dateTime?.time || "",
        customerData: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          company: formData.company,
        },
        projectDescription: formData.projectDescription,
        assignmentStrategy: "optimal",
      },
      {
        onSuccess: (result) => {
          // Show success details
          toast.success(
            `Booking confirmed! Reference: ${result.booking.bookingReference}`,
            {
              duration: 6000,
            }
          );

          console.log("Free booking created:", result.booking);

          // Reset form after successful submission
          setTimeout(() => {
            window.location.href = "/"; // Or navigate to a confirmation page
          }, 3000);
        },
        onError: () => {
          // Revert optimistic update on error
          if (bookingData.dateTime?.time) {
            updateTimeSlotOptimistically(bookingData.dateTime.time, false);
          }
        },
      }
    );
  };

  const canSubmit =
    Object.values(formData).every((value) => value.trim() !== "") &&
    isVerified &&
    !createBookingMutation.isPending;

  return (
    <div className="py-8">
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
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    errors.firstName
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="text-red-400 text-sm mt-2">
                    {errors.firstName}
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
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    errors.lastName
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-sm mt-2">{errors.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    errors.email
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="your.email@company.com"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-2">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    errors.phone
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && (
                  <p className="text-red-400 text-sm mt-2">{errors.phone}</p>
                )}
              </div>

              {/* Company */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 ${
                    errors.company
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="Your Company Name"
                />
                {errors.company && (
                  <p className="text-red-400 text-sm mt-2">{errors.company}</p>
                )}
              </div>

              {/* Project Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#6bdcc0] mb-2">
                  Project Description *
                </label>
                <textarea
                  value={formData.projectDescription}
                  onChange={(e) =>
                    handleInputChange("projectDescription", e.target.value)
                  }
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl bg-[#051028] border-2 text-white placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 resize-none ${
                    errors.projectDescription
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#64748b] focus:border-[#6bdcc0]"
                  }`}
                  placeholder="Please describe your project, goals, and what you're looking to achieve..."
                />
                {errors.projectDescription && (
                  <p className="text-red-400 text-sm mt-2">
                    {errors.projectDescription}
                  </p>
                )}
              </div>

              {/* Turnstile Widget - Clean, minimal integration */}
              <div className="md:col-span-2 flex justify-center py-4">
                <Turnstile
                  ref={turnstileRef}
                  onSuccess={handleTurnstileSuccess}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileExpire}
                />
              </div>

              {/* Turnstile Error (if any) */}
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between mt-12">
        <button
          onClick={onPrevious}
          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-[#6bdcc0] rounded-2xl transition-all duration-500 ease-out hover:scale-[1.02] shadow-xl focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 focus:ring-offset-2 focus:ring-offset-[#051028] transform hover:-translate-y-2 overflow-hidden backdrop-blur-sm"
          style={{
            background: "rgba(30, 41, 59, 0.4)",
            border: "2px solid #6bdcc0",
            boxShadow: "0 8px 32px rgba(107, 220, 192, 0.2)",
          }}
        >
          <svg
            className="w-5 h-5 mr-2 relative z-20 text-[#6bdcc0]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="relative z-20 font-bold tracking-wide group-hover:text-[#051028] transition-all duration-500">
            Back to Date & Time
          </span>

          {/* Hover Effects */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #6bdcc0 100%)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}
          ></div>
        </button>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || createBookingMutation.isPending}
          className={`group relative inline-flex items-center justify-center px-10 py-4 text-lg font-bold rounded-2xl transition-all duration-500 ease-out shadow-xl focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 focus:ring-offset-2 focus:ring-offset-[#051028] transform overflow-hidden backdrop-blur-sm ${
            canSubmit && !createBookingMutation.isPending
              ? "hover:scale-[1.02] hover:-translate-y-2"
              : "opacity-50 cursor-not-allowed"
          }`}
          style={{
            background:
              canSubmit && !createBookingMutation.isPending
                ? "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)"
                : "rgba(100, 116, 139, 0.5)",
            boxShadow:
              canSubmit && !createBookingMutation.isPending
                ? "0 8px 32px rgba(107, 220, 192, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                : "0 4px 16px rgba(100, 116, 139, 0.2)",
          }}
        >
          {createBookingMutation.isPending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#051028]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="relative z-20 text-[#051028] group-hover:text-[#6bdcc0] transition-all duration-500 font-bold tracking-wide">
                Creating Booking...
              </span>
            </>
          ) : (
            <>
              <span className="relative z-20 text-[#051028] group-hover:text-[#6bdcc0] transition-all duration-500 font-bold tracking-wide">
                {bookingData.service?.price === 0
                  ? "Confirm Booking"
                  : "Proceed to Payment"}
              </span>
              <svg
                className="w-5 h-5 ml-2 relative z-20 text-[#051028] group-hover:text-[#6bdcc0] transition-all duration-500"
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
            </>
          )}

          {/* Hover Effects */}
          {canSubmit && (
            <>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-2xl"
                style={{
                  background: "rgba(5, 16, 40, 0.95)",
                  border: "2px solid #6bdcc0",
                  boxShadow:
                    "0 0 20px rgba(107, 220, 192, 0.6), 0 0 40px rgba(107, 220, 192, 0.4)",
                }}
              ></div>

              <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700">
                <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
