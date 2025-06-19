"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [timezone, setTimezone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const router = useRouter();
  const { user, loading, updateProfile } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      if (!loading) {
        setIsAuthenticated(!!user);
        if (!user) {
          router.push("/auth/signin");
        } else {
          // Load existing user data
          setFullName(user.user_metadata?.full_name || "");
          setPhone(user.user_metadata?.phone || "");
          setCompany(user.user_metadata?.company || "");
          setTimezone(
            user.user_metadata?.timezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone
          );
        }
      }
    };

    checkAuth();
  }, [router, user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset messages
    setError("");
    setSuccess("");

    // Validation
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        company: company.trim(),
        timezone: timezone.trim(),
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Profile updated successfully!");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _unused = error;
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = () => {
    router.push("/auth/update-password");
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  // Show loading while checking authentication
  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen bg-[#051028] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#051028] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Profile Settings
          </h1>
          <p className="text-xl text-gray-300">
            Manage your account information and preferences
          </p>
        </div>

        {/* Back to Dashboard Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="flex items-center"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Button>
        </div>

        {/* Profile Form */}
        <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-8 border border-[#6bdcc0]/20 shadow-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Account Information Section */}
            <div className="pb-6 border-b border-[#6bdcc0]/20">
              <h3 className="text-xl font-semibold text-white mb-4">
                Account Information
              </h3>

              {/* Email (Read-only) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <div className="w-full px-4 py-3 rounded-xl bg-[#051028] bg-opacity-50 border border-gray-600 text-gray-400">
                  {user?.email}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              {/* Full Name */}
              <div className="mb-6">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-[#051028] bg-opacity-80
                    border border-[#6bdcc0]/30
                    text-white placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                    transition-all duration-300
                  "
                  placeholder="Enter your full name"
                />
              </div>

              {/* Phone Number */}
              <div className="mb-6">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Phone Number
                </label>
                <div className="phone-input-container">
                  <PhoneInput
                    defaultCountry="us"
                    value={phone}
                    onChange={(phone) => setPhone(phone)}
                    preferredCountries={[
                      "us", // United States
                      "ca", // Canada
                      "gb", // United Kingdom
                      "mx", // Mexico
                      "es", // Spain
                      "au", // Australia
                      "de", // Germany
                      "fr", // France
                      "it", // Italy
                      "br", // Brazil
                    ]}
                    inputStyle={{
                      width: "100%",
                      height: "48px",
                      fontSize: "16px",
                      backgroundColor: "rgba(5, 16, 40, 0.8)",
                      border: "1px solid rgba(107, 220, 192, 0.3)",
                      borderRadius: "0.75rem",
                      color: "white",
                      paddingLeft: "56px",
                    }}
                    countrySelectorStyleProps={{
                      buttonStyle: {
                        backgroundColor: "rgba(5, 16, 40, 0.8)",
                        border: "1px solid rgba(107, 220, 192, 0.3)",
                        borderRadius: "0.75rem 0 0 0.75rem",
                        borderRight: "none",
                      },
                      dropdownStyleProps: {
                        style: {
                          backgroundColor: "rgba(30, 41, 59, 0.95)",
                          border: "1px solid rgba(107, 220, 192, 0.3)",
                          borderRadius: "0.5rem",
                          color: "white",
                        },
                      },
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Include your country code for international numbers
                </p>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="pb-6 border-b border-[#6bdcc0]/20">
              <h3 className="text-xl font-semibold text-white mb-4">
                Professional Information
              </h3>

              {/* Company */}
              <div className="mb-6">
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Company / Organization
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-[#051028] bg-opacity-80
                    border border-[#6bdcc0]/30
                    text-white placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                    transition-all duration-300
                  "
                  placeholder="Enter your company name"
                />
              </div>

              {/* Timezone */}
              <div className="mb-6">
                <label
                  htmlFor="timezone"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-[#051028] bg-opacity-80
                    border border-[#6bdcc0]/30
                    text-white
                    focus:outline-none focus:ring-2 focus:ring-[#6bdcc0]/50 focus:border-[#6bdcc0]
                    transition-all duration-300
                  "
                >
                  <option value="America/New_York">Eastern Time (EST)</option>
                  <option value="America/Chicago">Central Time (CST)</option>
                  <option value="America/Denver">Mountain Time (MST)</option>
                  <option value="America/Los_Angeles">
                    Pacific Time (PST)
                  </option>
                  <option value="America/Phoenix">Arizona Time (MST)</option>
                  <option value="America/Anchorage">Alaska Time (AKST)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Europe/Berlin">Berlin (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                  <option value="Asia/Kolkata">Mumbai (IST)</option>
                  <option value="Australia/Sydney">Sydney (AEDT)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Used for scheduling meetings and notifications
                </p>
              </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 text-sm flex items-center">
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
                  {success}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm flex items-center">
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Updating Profile..." : "Update Profile"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handlePasswordChange}
                className="flex-1"
              >
                Change Password
              </Button>
            </div>
          </form>
        </div>

        {/* Account Status Card */}
        <div className="mt-8 bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            Account Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <span className="text-white">Email Verified</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
              <span className="text-white">Account Active</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
              <span className="text-white">Standard Plan</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
              <span className="text-gray-300">
                Joined {new Date(user?.created_at || "").toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
