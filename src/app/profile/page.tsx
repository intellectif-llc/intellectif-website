"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createClientComponentClient } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import {
  TIMEZONES_BY_REGION,
  getTimezoneWithFallback,
} from "@/constants/timezones";

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [timezone, setTimezone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const router = useRouter();
  const { user, loading, updateProfile } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      if (!loading) {
        setIsAuthenticated(!!user);
        if (!user) {
          router.push("/auth/signin");
        } else {
          // Load profile data from profiles table and auth.users
          try {
            // Get profile data from profiles table
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .single();

            if (profileData && !profileError) {
              // Use data from profiles table (most authoritative)
              setFirstName(profileData.first_name || "");
              setLastName(profileData.last_name || "");
              setCompany(profileData.company || "");
              setTimezone(getTimezoneWithFallback(profileData.timezone));
            } else {
              // Fallback to auth.users metadata
              const [firstName, ...lastNameParts] = (
                user.user_metadata?.full_name || ""
              ).split(" ");
              setFirstName(firstName || "");
              setLastName(lastNameParts.join(" ") || "");
              setCompany(user.user_metadata?.company || "");
              setTimezone(
                getTimezoneWithFallback(user.user_metadata?.timezone)
              );
            }

            // Phone number from the canonical source first, then fallback to metadata
            setPhone(user.phone || user.user_metadata?.phone || "");
          } catch (error) {
            console.error("Error loading profile data:", error);
            // Fallback to auth.users metadata
            const [firstName, ...lastNameParts] = (
              user.user_metadata?.full_name || ""
            ).split(" ");
            setFirstName(firstName || "");
            setLastName(lastNameParts.join(" ") || "");
            setPhone(user.phone || user.user_metadata?.phone || "");
            setCompany(user.user_metadata?.company || "");
            setTimezone(getTimezoneWithFallback(user.user_metadata?.timezone));
          }
        }
      }
    };

    checkAuth();
  }, [router, user, loading, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        company: company.trim(),
        timezone: timezone.trim(),
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
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

              {/* First Name and Last Name */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-white mb-2"
                  >
                    First Name <span className="text-red-400">*</span>
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
                    Last Name <span className="text-red-400">*</span>
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
                  {Object.entries(TIMEZONES_BY_REGION).map(
                    ([region, timezones]) => (
                      <optgroup key={region} label={region}>
                        {timezones.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label} {tz.offset && `(${tz.offset})`}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Used for scheduling meetings and notifications
                </p>
              </div>
            </div>

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
