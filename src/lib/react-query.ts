import { QueryClient } from "@tanstack/react-query";

// Create a stable QueryClient instance with optimized settings for booking system
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // More conservative stale times to reduce API calls
      staleTime: 2 * 60 * 1000, // 2 minutes for availability data
      // Keep data in cache longer for better UX when users navigate back
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry failed requests (network issues are common)
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      // Exponential backoff for retries
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10000),
      // Only refetch on window focus for critical data, not all queries
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: false,
      // Remove automatic background refetching to prevent constant API calls
      refetchInterval: false,
    },
    mutations: {
      // Retry mutations once on network errors
      retry: (failureCount: number, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

// Query key factories for consistent cache management
export const queryKeys = {
  // Services
  services: ["services"] as const,
  service: (id: string) => ["services", id] as const,

  // Availability
  availability: ["availability"] as const,
  availableDates: (serviceId?: string, daysAhead?: number) =>
    ["availability", "dates", { serviceId, daysAhead }] as const,
  timeSlots: (date: string, serviceId?: string) =>
    ["availability", "slots", { date, serviceId }] as const,

  // Bookings
  bookings: ["bookings"] as const,
  booking: (id: string) => ["bookings", id] as const,
  userBookings: (email?: string) => ["bookings", "user", email] as const,

  // Consultant availability management
  templates: ["templates"] as const,
  breaks: ["breaks"] as const,
  timeoff: ["timeoff"] as const,
  bufferTimes: ["bufferTimes"] as const,

  // Profile
  profile: ["profile"] as const,
} as const;

// Utility function to invalidate related queries after mutations
export const invalidateAvailabilityQueries = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.availability });
};

export const invalidateBookingQueries = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
};

// Prefetch commonly needed data
export const prefetchServices = () => {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.services,
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) {
        throw new Error("Failed to fetch services");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Services change infrequently
  });
};
