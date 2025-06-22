"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import WeeklyAvailability from "@/components/availability/WeeklyAvailability";
import BreakManager from "@/components/availability/BreakManager";
import TimeOffManager from "@/components/availability/TimeOffManager";
import BufferTimeManager from "@/components/availability/BufferTimeManager";

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: "weekly", label: "Weekly Schedule", icon: "📅" },
  { id: "breaks", label: "Breaks", icon: "☕" },
  { id: "timeoff", label: "Time Off", icon: "🏖️" },
  { id: "buffer", label: "Buffer Times", icon: "⏱️" },
];

export default function AvailabilityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("weekly");
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
      return;
    }

    // Check if user is staff (consultant)
    const checkStaffStatus = async () => {
      if (!user) return;

      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setIsStaff(data.profile?.is_staff || false);

          if (!data.profile?.is_staff) {
            router.push("/dashboard");
          }
        }
      } catch (error) {
        console.error("Error checking staff status:", error);
        router.push("/dashboard");
      }
    };

    if (user) {
      checkStaffStatus();
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051028] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0]"></div>
      </div>
    );
  }

  if (!user || !isStaff) {
    return null;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "weekly":
        return <WeeklyAvailability />;
      case "breaks":
        return <BreakManager />;
      case "timeoff":
        return <TimeOffManager />;
      case "buffer":
        return <BufferTimeManager consultantId={user!.id} />;
      default:
        return <WeeklyAvailability />;
    }
  };

  return (
    <div className="min-h-screen bg-[#051028] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Availability Manager
          </h1>
          <p className="text-xl text-gray-300">
            Manage your consultation schedule and availability
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group relative inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-500 ease-out
                  ${
                    activeTab === tab.id
                      ? "text-[#051028] shadow-2xl transform scale-105"
                      : "text-[#6bdcc0] hover:text-[#051028] hover:shadow-xl hover:scale-105"
                  }
                `}
                style={{
                  background:
                    activeTab === tab.id
                      ? "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)"
                      : "rgba(30, 41, 59, 0.4)",
                  border:
                    activeTab === tab.id
                      ? "2px solid transparent"
                      : "2px solid #6bdcc0",
                  boxShadow:
                    activeTab === tab.id
                      ? "0 8px 32px rgba(107, 220, 192, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                      : "0 8px 32px rgba(107, 220, 192, 0.2), inset 0 1px 0 rgba(107, 220, 192, 0.1)",
                }}
              >
                <span className="text-2xl">{tab.icon}</span>
                <span className="relative z-20 transition-all duration-500 font-bold tracking-wide">
                  {tab.label}
                </span>

                {/* Hover effect for inactive tabs */}
                {activeTab !== tab.id && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #6bdcc0 100%)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300 ease-in-out">
          {renderTabContent()}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              size="md"
              onClick={() => router.push("/dashboard")}
            >
              ← Back to Dashboard
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => window.location.reload()}
            >
              🔄 Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
