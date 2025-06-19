"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Welcome to your Dashboard
          </h1>
          <p className="text-xl text-gray-300">
            Hello, {user.user_metadata?.full_name || user.email}!
          </p>
        </div>

        {/* Dashboard Content */}
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
                <span className="text-gray-400 text-sm">Account Created:</span>
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
                <span className="text-white">Standard Plan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="text-center">
          <Button variant="secondary" size="lg" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
