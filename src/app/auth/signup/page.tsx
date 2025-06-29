"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Turnstile, { type TurnstileRef } from "@/components/ui/Turnstile";
import { useTurnstile } from "@/hooks/useTurnstile";
import toast from "react-hot-toast";
import { PhoneInput } from "react-international-phone";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConsentError, setShowConsentError] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [consent, setConsent] = useState(false);
  const turnstileRef = useRef<TurnstileRef>(null);

  const { signUp } = useAuth();

  const {
    isVerified,
    isLoading: isTurnstileLoading,
    error: turnstileError,
    handleSuccess,
    handleError,
    handleExpire,
    reset: resetTurnstile,
  } = useTurnstile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified) {
      toast.error(
        "Please complete the security verification before submitting."
      );
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, {
      fullName,
      phone,
      company,
      timezone,
      consent,
    });

    if (error) {
      toast.error(error.message);
      // Reset Turnstile on submission failure to allow user to retry
      turnstileRef.current?.reset();
      resetTurnstile();
    } else {
      toast.success(
        "Confirmation email sent! Please check your inbox to verify your account."
      );
    }
    setIsLoading(false);
  };

  const handleConsentChange = (checked: boolean) => {
    setAcceptTerms(checked);
    // Clear consent-related errors when user accepts terms
    if (checked && showConsentError) {
      setShowConsentError(false);
      setError("");
    }
  };

  const isSubmitDisabled = isLoading || isTurnstileLoading || !isVerified;

  return (
    <div className="min-h-screen bg-[#051028] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold gradient-text">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Join Intellectif to elevate your business efficiency
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* First Name and Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-white mb-2"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-[#051028] bg-opacity-80
                    border border-[#6bdcc0]/30
                    text-white placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                    transition-all duration-300
                  "
                  placeholder="First name"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-[#051028] bg-opacity-80
                    border border-[#6bdcc0]/30
                    text-white placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                    transition-all duration-300
                  "
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[#051028] bg-opacity-80
                  border border-[#6bdcc0]/30
                  text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                  transition-all duration-300
                "
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[#051028] bg-opacity-80
                  border border-[#6bdcc0]/30
                  text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                  transition-all duration-300
                "
                placeholder="Create a password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-white mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[#051028] bg-opacity-80
                  border border-[#6bdcc0]/30
                  text-white placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                  transition-all duration-300
                "
                placeholder="Confirm your password"
              />
            </div>

            {/* Turnstile Widget - Clean, minimal integration */}
            <div className="flex justify-center py-2">
              <Turnstile
                ref={turnstileRef}
                onSuccess={handleSuccess}
                onError={handleError}
                onExpire={handleExpire}
              />
            </div>

            {/* Turnstile Error (if any) */}
            {turnstileError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm text-center">
                  {turnstileError}
                </p>
              </div>
            )}

            {/* Error Message - Only show if not a consent error */}
            {error && !showConsentError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            {/* Terms and Conditions Consent */}
            <div
              className={`
              relative p-4 rounded-xl border transition-all duration-300
              ${
                showConsentError
                  ? "bg-red-500/5 border-red-500/40 shadow-red-500/20 shadow-lg"
                  : "bg-[#051028]/30 border-[#6bdcc0]/20 hover:border-[#6bdcc0]/40"
              }
            `}
            >
              <div className="flex items-start space-x-3">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => handleConsentChange(e.target.checked)}
                    className="sr-only"
                    aria-describedby="terms-description"
                  />
                  <label
                    htmlFor="acceptTerms"
                    className={`
                      flex items-center justify-center w-5 h-5 rounded-md border-2 cursor-pointer
                      transition-all duration-200 ease-in-out
                      ${
                        acceptTerms
                          ? "bg-[#6bdcc0] border-[#6bdcc0] text-[#051028]"
                          : showConsentError
                          ? "border-red-400 bg-red-500/10 hover:border-red-300"
                          : "border-[#6bdcc0]/50 bg-[#051028]/50 hover:border-[#6bdcc0] hover:bg-[#6bdcc0]/10"
                      }
                    `}
                  >
                    {acceptTerms && (
                      <svg
                        className="w-3 h-3 text-current"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="acceptTerms"
                    id="terms-description"
                    className={`
                      text-sm leading-relaxed cursor-pointer transition-colors duration-200
                      ${
                        showConsentError
                          ? "text-red-300"
                          : "text-gray-300 hover:text-white"
                      }
                    `}
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6bdcc0] hover:text-[#22d3ee] font-medium transition-colors duration-300 underline decoration-[#6bdcc0]/30 hover:decoration-[#22d3ee]/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms and Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6bdcc0] hover:text-[#22d3ee] font-medium transition-colors duration-300 underline decoration-[#6bdcc0]/30 hover:decoration-[#22d3ee]/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </Link>
                  </label>
                  {showConsentError && (
                    <div className="mt-2 flex items-center space-x-2">
                      <svg
                        className="w-4 h-4 text-red-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-red-400 text-xs">
                        Please accept our Terms and Conditions and Privacy
                        Policy to continue
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isSubmitDisabled}
              className="w-full"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            {/* Helper text for disabled state */}
            {(!isVerified || !acceptTerms) && !isLoading && (
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-400">
                  {!isVerified &&
                    !acceptTerms &&
                    "Complete security verification and accept terms to continue"}
                  {!isVerified &&
                    acceptTerms &&
                    "Complete security verification to continue"}
                  {isVerified &&
                    !acceptTerms &&
                    "Accept Terms and Conditions to continue"}
                </p>
              </div>
            )}
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="text-[#6bdcc0] hover:text-[#22d3ee] font-medium transition-colors duration-300"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
