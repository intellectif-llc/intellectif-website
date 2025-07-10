import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminStatus {
  isAdmin: boolean;
  isStaff: boolean;
  loading: boolean;
  error: string | null;
}

export function useAdminAuth(): AdminStatus {
  const { user, loading: authLoading } = useAuth();
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    isStaff: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setAdminStatus({
          isAdmin: false,
          isStaff: false,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        console.log("🔍 Checking admin status for user:", user.id);

        const response = await fetch("/api/profile");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const profile = data.profile;

        console.log("📊 User profile data:", {
          userId: user.id,
          email: user.email,
          role: profile?.role,
          isStaff: profile?.is_staff,
        });

        const isStaff = profile?.is_staff === true;
        const isAdmin = profile?.role === "admin" && isStaff;

        console.log("🎯 Admin status result:", {
          isAdmin,
          isStaff,
          hasAdminRole: profile?.role === "admin",
          hasStaffFlag: isStaff,
        });

        setAdminStatus({
          isAdmin,
          isStaff,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("❌ Error checking admin status:", error);
        setAdminStatus({
          isAdmin: false,
          isStaff: false,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  return {
    ...adminStatus,
    loading: authLoading || adminStatus.loading,
  };
}

// Helper hook for staff-only access (less restrictive than admin)
export function useStaffAuth() {
  const { user, loading: authLoading } = useAuth();
  const [staffStatus, setStaffStatus] = useState({
    isStaff: false,
    loading: true,
    error: null as string | null,
  });

  useEffect(() => {
    const checkStaffStatus = async () => {
      if (!user) {
        setStaffStatus({
          isStaff: false,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        const response = await fetch("/api/profile");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const isStaff = data.profile?.is_staff === true;

        setStaffStatus({
          isStaff,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("❌ Error checking staff status:", error);
        setStaffStatus({
          isStaff: false,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    if (!authLoading) {
      checkStaffStatus();
    }
  }, [user, authLoading]);

  return {
    ...staffStatus,
    loading: authLoading || staffStatus.loading,
  };
}
