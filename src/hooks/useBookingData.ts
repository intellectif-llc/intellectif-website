import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  invalidateAvailabilityQueries,
  invalidateBookingQueries,
} from "@/lib/react-query";
import toast from "react-hot-toast";
import { useCallback, useRef } from "react";

// Types
export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  features: string[];
  popular?: boolean;
  slug: string;
  requiresPayment?: boolean;
}

export interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
  availableSlots: number;
  consultants: Array<{
    id: string;
    name: string;
    availableSlots: number;
    totalDuration?: number;
    bufferBefore?: number;
    bufferAfter?: number;
  }>;
}

export interface AvailableDate {
  value: string;
  display: string;
  fullDate: string;
  dayOfWeek: number;
  totalAvailableSlots: number;
}

export interface BookingData {
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  customerData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    company?: string;
  };
  projectDescription: string;
  assignmentStrategy?: string;
}

// API functions
const fetchServices = async (): Promise<{ services: Service[] }> => {
  const response = await fetch("/api/services");
  if (!response.ok) {
    throw new Error(`Failed to fetch services: ${response.status}`);
  }
  return response.json();
};

const fetchAvailableDates = async (
  serviceId?: string,
  daysAhead: number = 21
): Promise<{
  availableDates: AvailableDate[];
  serviceDuration: number;
  totalDatesChecked: number;
}> => {
  const params = new URLSearchParams();
  if (serviceId) {
    params.append("service_id", serviceId);
  }
  params.append("days_ahead", daysAhead.toString());

  const response = await fetch(`/api/availability/dates?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch available dates: ${response.status}`);
  }
  return response.json();
};

const fetchTimeSlots = async (
  date: string,
  serviceId?: string
): Promise<{
  timeSlots: TimeSlot[];
  date: string;
  serviceDuration: number;
  service?: {
    name: string;
    duration: number;
    totalDuration: number;
    bufferBefore: number;
    bufferAfter: number;
  };
}> => {
  const params = new URLSearchParams({ date });
  if (serviceId) {
    params.append("service_id", serviceId);
  }

  const response = await fetch(`/api/availability/slots?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch time slots: ${response.status}`);
  }
  return response.json();
};

const createBooking = async (bookingData: BookingData) => {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bookingData),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `Booking failed: ${response.status}`);
  }

  return response.json();
};

// Custom hooks
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: fetchServices,
    staleTime: 10 * 60 * 1000, // Services don't change often - 10 minutes
    gcTime: 30 * 60 * 1000, // Keep services in cache for 30 minutes
    select: (data) => data.services,
  });
}

export function useAvailableDates(serviceId?: string, daysAhead: number = 21) {
  return useQuery({
    queryKey: queryKeys.availableDates(serviceId, daysAhead),
    queryFn: () => fetchAvailableDates(serviceId, daysAhead),
    enabled: !!serviceId, // Only fetch when serviceId is available
    staleTime: 3 * 60 * 1000, // Dates change less frequently - 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    select: (data) => data.availableDates,
  });
}

export function useTimeSlots(date: string, serviceId?: string) {
  return useQuery({
    queryKey: queryKeys.timeSlots(date, serviceId),
    queryFn: () => fetchTimeSlots(date, serviceId),
    enabled: !!date && !!serviceId, // Only fetch when both date and serviceId are available
    staleTime: 1 * 60 * 1000, // Time slots change frequently - 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    // Enable refetch on window focus for time slots since they're most critical
    refetchOnWindowFocus: true,
    select: (data) => ({
      timeSlots: data.timeSlots,
      serviceDuration: data.serviceDuration,
      serviceInfo: data.service,
    }),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      // Invalidate and refetch availability data
      invalidateAvailabilityQueries();
      invalidateBookingQueries();

      toast.success("Booking created successfully!");

      // Optionally, you can also invalidate specific queries
      queryClient.invalidateQueries({ queryKey: queryKeys.availability });
    },
    onError: (error: Error) => {
      console.error("Booking creation failed:", error);
      toast.error(error.message || "Failed to create booking");
    },
  });
}

// Optimistic updates for better UX
export function useOptimisticTimeSlots(date: string, serviceId?: string) {
  const queryClient = useQueryClient();

  const updateTimeSlotOptimistically = (
    timeSlot: string,
    reduce: boolean = true
  ) => {
    const queryKey = queryKeys.timeSlots(date, serviceId);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.timeSlots) return oldData;

      return {
        ...oldData,
        timeSlots: oldData.timeSlots.map((slot: TimeSlot) => {
          if (slot.time === timeSlot && slot.availableSlots > 0) {
            return {
              ...slot,
              availableSlots: reduce
                ? Math.max(0, slot.availableSlots - 1)
                : slot.availableSlots + 1,
              available: reduce ? slot.availableSlots > 1 : true,
            };
          }
          return slot;
        }),
      };
    });
  };

  return { updateTimeSlotOptimistically };
}

// Throttled prefetch to prevent excessive API calls
export function usePrefetchTimeSlots() {
  const queryClient = useQueryClient();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPrefetchRef = useRef<string>("");

  const prefetchTimeSlots = useCallback(
    (date: string, serviceId?: string) => {
      if (!date || !serviceId) return;

      const cacheKey = `${date}-${serviceId}`;

      // Don't prefetch the same data twice in quick succession
      if (lastPrefetchRef.current === cacheKey) return;

      // Clear any existing timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }

      // Throttle prefetch requests to prevent excessive API calls
      prefetchTimeoutRef.current = setTimeout(() => {
        // Check if data is already in cache and still fresh
        const existingData = queryClient.getQueryData(
          queryKeys.timeSlots(date, serviceId)
        );
        const queryState = queryClient.getQueryState(
          queryKeys.timeSlots(date, serviceId)
        );

        // Only prefetch if data doesn't exist or is stale
        if (
          !existingData ||
          (queryState && Date.now() - queryState.dataUpdatedAt > 60000)
        ) {
          queryClient.prefetchQuery({
            queryKey: queryKeys.timeSlots(date, serviceId),
            queryFn: () => fetchTimeSlots(date, serviceId),
            staleTime: 1 * 60 * 1000, // 1 minute stale time for prefetched data
          });
          lastPrefetchRef.current = cacheKey;
        }
      }, 300); // 300ms throttle
    },
    [queryClient]
  );

  return { prefetchTimeSlots };
}
