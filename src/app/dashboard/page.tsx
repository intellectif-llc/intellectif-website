"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import Button from "@/components/ui/Button";
import BookingManager from "@/components/dashboard/BookingManager";
import Link from "next/link";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin, isStaff, loading: adminLoading } = useAdminAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "overview" | "bookings" | "solutions"
  >("overview");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading || adminLoading) {
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
            {isAdmin
              ? "Admin Dashboard"
              : isStaff
              ? "Staff Dashboard"
              : "Welcome to your Dashboard"}
          </h1>
          <p className="text-xl text-gray-300">
            Hello, {user.user_metadata?.full_name || user.email}!
            {isAdmin && (
              <span className="text-[#6bdcc0] ml-2">• Administrator</span>
            )}
            {isStaff && !isAdmin && (
              <span className="text-[#6bdcc0] ml-2">• Staff Member</span>
            )}
          </p>
        </div>

        {/* Staff/Admin Navigation Tabs */}
        {(isStaff || isAdmin) && (
          <div className="mb-8">
            <div className="flex justify-center gap-4 flex-wrap">
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

              {isStaff && (
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
              )}

              {isAdmin && (
                <button
                  onClick={() => setActiveTab("solutions")}
                  className={`
                    px-6 py-3 rounded-xl font-semibold transition-all duration-300
                    ${
                      activeTab === "solutions"
                        ? "bg-[#6bdcc0] text-[#051028] shadow-lg"
                        : "bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 hover:bg-[#6bdcc0]/10"
                    }
                  `}
                >
                  🛠️ Manage Solutions
                </button>
              )}
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

        {/* Admin Solutions Management Tab */}
        {isAdmin && activeTab === "solutions" && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 border border-[#6bdcc0]/20 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  🛠️ Solutions Management
                </h2>
                <p className="text-gray-300 text-lg">
                  Manage all solutions, features, and selling points from this
                  admin panel
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Quick Stats Cards */}
                <div className="bg-[#051028] rounded-2xl p-6 border border-[#6bdcc0]/10">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#6bdcc0] mb-2">
                      ⚡
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Quick Actions
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Manage solutions efficiently
                    </p>
                    <Link
                      href="/admin/solutions"
                      className="inline-block bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] text-[#051028] px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                      Open Solutions Manager
                    </Link>
                  </div>
                </div>

                <div className="bg-[#051028] rounded-2xl p-6 border border-[#6bdcc0]/10">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#6bdcc0] mb-2">
                      📊
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Analytics
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      View solution statistics
                    </p>
                    <Link
                      href="/solutions"
                      target="_blank"
                      className="inline-block bg-[#1e293b] text-[#6bdcc0] border border-[#6bdcc0]/30 px-6 py-3 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 transition-colors"
                    >
                      View Live Page
                    </Link>
                  </div>
                </div>

                <div className="bg-[#051028] rounded-2xl p-6 border border-[#6bdcc0]/10">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#6bdcc0] mb-2">
                      🎯
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Features
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Full CRUD operations
                    </p>
                    <div className="text-[#6bdcc0] font-semibold">
                      ✓ Create • ✓ Read • ✓ Update • ✓ Delete
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#051028] rounded-2xl p-6 border border-[#6bdcc0]/10">
                <h3 className="text-xl font-semibold text-white mb-4 text-center">
                  🔐 Admin Capabilities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-[#6bdcc0] font-semibold">
                      Solutions Management:
                    </h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>
                        • Create new solutions (SaaS, Plugins, Third-party)
                      </li>
                      <li>• Edit existing solution details and pricing</li>
                      <li>• Toggle solution visibility (active/inactive)</li>
                      <li>• Manage solution display order</li>
                      <li>• Upload and manage brand logos (S3/CloudFront)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[#6bdcc0] font-semibold">
                      Content Management:
                    </h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Add/edit solution features by category</li>
                      <li>• Manage selling points with emojis</li>
                      <li>• Set display orders for better organization</li>
                      <li>• Bulk operations for efficiency</li>
                      <li>• Real-time preview of changes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm">
                  Admin access verified • Role: Administrator • All operations
                  logged
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
