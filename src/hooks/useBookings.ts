import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookingService,
  type BookingData,
  type BookingFilters,
  type BookingUpdate,
} from "@/lib/booking-service";
import { queryKeys } from "@/lib/react-query";
import toast from "react-hot-toast";

// Single source of truth for booking operations
export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: [...queryKeys.bookings, filters],
    queryFn: async () => {
      try {
        // Get current user context
        const response = await fetch("/api/profile");
        if (!response.ok) {
          throw new Error("Failed to get user profile");
        }
        const { profile } = await response.json();

        if (filters) {
          return BookingService.getBookings(filters, {
            userId: profile.id,
            isStaff: profile.is_staff || false,
          });
        } else {
          return BookingService.getUserBookings(profile.id);
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // Bookings change frequently
    retry: (failureCount, error: Error | unknown) => {
      // Don't retry on 401 (unauthorized)
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("401")
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: [...queryKeys.bookings, bookingId],
    queryFn: async () => {
      try {
        // Get current user context
        const response = await fetch("/api/profile");
        const userContext = response.ok ? await response.json() : null;

        return BookingService.getBooking(
          bookingId,
          userContext?.profile
            ? {
                userId: userContext.profile.id,
                isStaff: userContext.profile.is_staff || false,
              }
            : undefined
        );
      } catch (error) {
        console.error("Error fetching booking:", error);
        throw error;
      }
    },
    enabled: !!bookingId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      updates,
    }: {
      bookingId: string;
      updates: BookingUpdate;
    }) => {
      // Get current user context
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Failed to get user profile");
      }
      const { profile } = await response.json();

      return BookingService.updateBooking(bookingId, updates, {
        userId: profile.id,
        isStaff: profile.is_staff || false,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate all booking queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });

      // Update specific booking in cache
      queryClient.setQueryData(
        [...queryKeys.bookings, variables.bookingId],
        data
      );

      toast.success("Booking updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });
}

export function useAssignConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      consultantId,
    }: {
      bookingId: string;
      consultantId: string | null;
    }) => {
      // Get current user context
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Failed to get user profile");
      }
      const { profile } = await response.json();

      return BookingService.assignConsultant(bookingId, consultantId, {
        userId: profile.id,
        isStaff: profile.is_staff || false,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      queryClient.setQueryData(
        [...queryKeys.bookings, variables.bookingId],
        data
      );

      const action = variables.consultantId ? "assigned" : "unassigned";
      toast.success(`Booking ${action} successfully!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign consultant");
    },
  });
}

export function useBookingStats() {
  return useQuery({
    queryKey: [...queryKeys.bookings, "stats"],
    queryFn: async () => {
      try {
        // Get current user context
        const response = await fetch("/api/profile");
        const userContext = response.ok ? await response.json() : null;

        return BookingService.getBookingStats(
          userContext?.profile
            ? {
                userId: userContext.profile.id,
                isStaff: userContext.profile.is_staff || false,
              }
            : undefined
        );
      } catch (error) {
        console.error("Error fetching booking stats:", error);
        throw error;
      }
    },
    staleTime: 60 * 1000, // Stats don't change as frequently
  });
}

// Legacy API compatibility functions (to be phased out)
export function useBookingsLegacy() {
  return useQuery({
    queryKey: queryKeys.bookings,
    queryFn: async () => {
      const response = await fetch("/api/bookings");
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.status}`);
      }
      const data = await response.json();
      return data.bookings;
    },
    staleTime: 30 * 1000,
    retry: (failureCount, error: Error | unknown) => {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("401")
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Real-time booking updates
export function useRealTimeBookings() {
  const queryClient = useQueryClient();

  const refreshBookings = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
  };

  // You could extend this to use WebSocket or Server-Sent Events
  // for real-time updates when bookings are created/modified

  return { refreshBookings };
}

// Helper hooks for specific use cases
export function useMyBookings() {
  return useBookings(); // No filters = user's own bookings
}

export function useTeamBookings() {
  return useBookings({}); // Empty filters = all bookings (if staff)
}

export function useUnassignedBookings() {
  return useBookings({ unassigned: true });
}

export function useConsultantBookings(consultantId: string) {
  return useBookings({ consultantId });
}

export function useCustomerBookings(customerId: string) {
  return useBookings({ customerId });
}
