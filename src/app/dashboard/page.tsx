"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import BookingManager from "@/components/dashboard/BookingManager";
import GoogleIntegrationSettings from "@/components/dashboard/GoogleIntegrationSettings";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isStaff, setIsStaff] = useState(false);
  const [staffLoading, setStaffLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "bookings">(
    "overview"
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  // Check if user is staff
  useEffect(() => {
    const checkStaffStatus = async () => {
      if (!user) {
        setIsStaff(false);
        setStaffLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setIsStaff(data.profile?.is_staff || false);
        } else {
          setIsStaff(false);
        }
      } catch (error) {
        console.error("Error checking staff status:", error);
        setIsStaff(false);
      } finally {
        setStaffLoading(false);
      }
    };

    if (!loading) {
      checkStaffStatus();
    }
  }, [user, loading]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading || staffLoading) {
    return (
      <div className="min-h-screen bg-[#051028] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#051028] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            {isStaff ? "Staff Dashboard" : "Welcome to your Dashboard"}
          </h1>
          <p className="text-xl text-gray-300">
            Hello, {user.user_metadata?.full_name || user.email}!
            {isStaff && (
              <span className="text-[#6bdcc0] ml-2">• Staff Member</span>
            )}
          </p>
        </div>

        {/* Staff Navigation Tabs */}
        {isStaff && (
          <div className="mb-8">
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setActiveTab("overview")}
                className={`
                  px-6 py-3 rounded-xl font-semibold transition-all duration-300
                  ${
                    activeTab === "overview"
                      ? "bg-[#6bdcc0] text-[#051028] shadow-lg"
                      : "bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 hover:bg-[#6bdcc0]/10"
                  }
                `}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab("bookings")}
                className={`
                  px-6 py-3 rounded-xl font-semibold transition-all duration-300
                  ${
                    activeTab === "bookings"
                      ? "bg-[#6bdcc0] text-[#051028] shadow-lg"
                      : "bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 hover:bg-[#6bdcc0]/10"
                  }
                `}
              >
                📅 Booking Management
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {activeTab === "overview" && (
          <div>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {/* Profile Card */}
              <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Profile Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Email:</span>
                    <p className="text-white">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Full Name:</span>
                    <p className="text-white">
                      {user.user_metadata?.full_name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">
                      Account Created:
                    </span>
                    <p className="text-white">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/booking")}
                  >
                    Book a Meeting
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/")}
                  >
                    View Services
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/profile")}
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>

              {/* Account Status Card */}
              <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Account Status
                </h3>
                <div className="space-y-3">
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
                    <span className="text-white">
                      {isStaff ? "Staff Member" : "Standard Plan"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Integration Settings for Staff */}
            {isStaff && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  🔗 Google Integration Settings
                </h2>
                <GoogleIntegrationSettings consultantId={user?.id || ""} />
              </div>
            )}

            {/* My Bookings Section for All Users */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                📅 My Bookings
              </h2>
              <BookingManager />
            </div>

            {/* Sign Out Section */}
            <div className="text-center">
              <Button variant="secondary" size="lg" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        )}

        {/* Staff Booking Management Tab */}
        {isStaff && activeTab === "bookings" && (
          <div className="max-w-6xl mx-auto">
            <BookingManager />
          </div>
        )}
      </div>
    </div>
  );
}
