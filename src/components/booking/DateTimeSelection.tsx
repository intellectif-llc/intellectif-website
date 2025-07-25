import React, { useState, useCallback, useEffect } from "react";
import {
  useAvailableDates,
  useTimeSlots,
  usePrefetchTimeSlots,
} from "@/hooks/useBookingData";
import { useAuth } from "@/contexts/AuthContext";

interface DateTimeSelectionProps {
  selectedDateTime: { date: string; time: string } | null;
  onDateTimeSelect: (dateTime: { date: string; time: string }) => void;
  onNext: () => void;
  onPrevious: () => void;
  serviceId?: string; // Add service ID for duration calculation
}

export default function DateTimeSelection({
  selectedDateTime,
  onDateTimeSelect,
  onNext,
  onPrevious,
  serviceId,
}: DateTimeSelectionProps) {
  const [selectedDate, setSelectedDate] = useState(
    selectedDateTime?.date || ""
  );
  const [selectedTime, setSelectedTime] = useState(
    selectedDateTime?.time || ""
  );
  const [isStaff, setIsStaff] = useState(false);
  const [staffStatusLoading, setStaffStatusLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const { user } = useAuth();

  // Check staff status for current user
  useEffect(() => {
    const checkStaffStatus = async () => {
      setStaffStatusLoading(true);
      if (!user) {
        setIsStaff(false);
        setStaffStatusLoading(false);
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
        setStaffStatusLoading(false);
      }
    };

    checkStaffStatus();
  }, [user]);

  // Use TanStack Query hooks for data fetching
  const {
    data: availableDates = [],
    isLoading: datesLoading,
    error: datesError,
  } = useAvailableDates(serviceId, 21);

  const {
    data: timeSlotsData,
    isLoading: loading,
    error: slotsError,
  } = useTimeSlots(selectedDate, serviceId);

  // Extract time slots and service info from the response
  const timeSlots = timeSlotsData?.timeSlots || [];
  const serviceInfo = timeSlotsData?.serviceInfo;
  const serviceDuration = timeSlotsData?.serviceDuration;

  const { prefetchTimeSlots } = usePrefetchTimeSlots();

  // Throttled prefetch time slots for better UX when hovering over dates
  const handleDateHover = useCallback(
    (date: string) => {
      setHoveredDate(date);
      if (date && serviceId && date !== selectedDate) {
        prefetchTimeSlots(date, serviceId);
      }
    },
    [prefetchTimeSlots, serviceId, selectedDate]
  );

  const handleDateLeave = useCallback(() => {
    setHoveredDate(null);
  }, []);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (selectedTime) {
      onDateTimeSelect({ date, time: selectedTime });
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      onDateTimeSelect({ date: selectedDate, time });
    }
  };

  const canContinue = selectedDate && selectedTime;

  // Helper function to get availability display text
  const getDateAvailabilityText = (date: any) => {
    // Show slot counts only to staff users
    if (
      !staffStatusLoading &&
      isStaff &&
      typeof date.totalAvailableSlots === "number"
    ) {
      return `${date.totalAvailableSlots} slot${
        date.totalAvailableSlots !== 1 ? "s" : ""
      } available`;
    }
    
    // For non-staff users, show "Available"
    return "Available";
  };

  // Helper function for time slot display
  const getTimeSlotDisplay = (time: any) => {
    // For staff users, show slot counts instead of dots
    if (
      !staffStatusLoading &&
      isStaff &&
      typeof time.availableSlots === "number"
    ) {
      return (
        <div className="text-xs text-center mt-1 opacity-75">
          {time.availableSlots} slot{time.availableSlots !== 1 ? "s" : ""}
        </div>
      );
    }

    // For regular users, show the availability dot
    if (time.available) {
      return (
        <div className="flex justify-center mt-1">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              selectedTime === time.time
                ? "bg-[#6bdcc0]"
                : "bg-[#64748b] group-hover:bg-[#6bdcc0]"
            }`}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Pick Your Preferred Date & Time
        </h2>
        <p className="text-lg text-[#64748b] max-w-2xl mx-auto">
          Choose a convenient time for your consultation. All times are in your
          local timezone.
        </p>
      </div>

      {/* Error handling */}
      {(datesError || slotsError) && (
        <div className="mb-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-400 text-center">
              {datesError instanceof Error
                ? datesError.message
                : slotsError instanceof Error
                ? slotsError.message
                : "Failed to load availability data. Please refresh the page."}
            </p>
          </div>
        </div>
      )}

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Date Selection - Progressive Disclosure with Optimized Mobile Layout */}
        <div>
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <svg
              className="w-6 h-6 text-[#6bdcc0] mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
              />
            </svg>
            Select Date
          </h3>
          {/* FIXED: Always use 2 columns, even on mobile, to optimize vertical space */}
          <div className="grid grid-cols-2 gap-3">
            {datesLoading ? (
              <div className="col-span-2 text-center py-8">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-[#6bdcc0]/20 transition ease-in-out duration-150">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#6bdcc0]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading available dates...
                </div>
              </div>
            ) : availableDates.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <div className="text-[#64748b] mb-4">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-[#64748b]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-lg font-medium">
                    No available dates found
                  </p>
                  <p className="text-sm mt-2">
                    Please check your availability settings or try again later.
                  </p>
                </div>
              </div>
            ) : (
              availableDates.map((date) => {
                const isHovered = hoveredDate === date.value;
                const isSelected = selectedDate === date.value;

                return (
                  <button
                    key={date.value}
                    onClick={() => handleDateSelect(date.value)}
                    onMouseEnter={() => handleDateHover(date.value)}
                    onMouseLeave={handleDateLeave}
                    className={`
                      group relative p-3 sm:p-4 rounded-xl text-left transition-all duration-300 ease-out hover:scale-[1.02] transform
                      ${
                        isSelected
                          ? "ring-2 ring-[#6bdcc0]"
                          : "hover:-translate-y-1"
                      }
                    `}
                    style={{
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(107, 220, 192, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)"
                        : "rgba(30, 41, 59, 0.4)",
                      border: isSelected
                        ? "2px solid #6bdcc0"
                        : "2px solid rgba(107, 220, 192, 0.2)",
                      boxShadow: isSelected
                        ? "0 8px 32px rgba(107, 220, 192, 0.3)"
                        : "0 4px 16px rgba(107, 220, 192, 0.1)",
                    }}
                  >
                    {/* Date Display - Compact for mobile */}
                    <div
                      className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${
                        isSelected
                          ? "text-[#6bdcc0]"
                          : "text-white group-hover:text-[#6bdcc0]"
                      }`}
                    >
                      {date.display}
                    </div>

                    {/* Show availability info */}
                    <div className="text-xs sm:text-sm text-[#64748b] mt-1">
                      {getDateAvailabilityText(date)}
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#6bdcc0] rounded-full flex items-center justify-center">
                          <svg
                            className="w-2 h-2 sm:w-3 sm:h-3 text-[#051028]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Time Selection - Compact with Staff Slot Counts */}
        <div>
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <svg
              className="w-6 h-6 text-[#6bdcc0] mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Select Time
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {loading ? (
              <div className="col-span-full text-center py-8">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-[#6bdcc0]/20 transition ease-in-out duration-150">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#6bdcc0]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading available times...
                </div>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <div className="text-[#64748b]">
                  {selectedDate
                    ? "No available time slots for this date"
                    : "Please select a date first"}
                </div>
              </div>
            ) : (
              timeSlots.map((time) => (
                <button
                  key={time.time}
                  onClick={() => handleTimeSelect(time.time)}
                  disabled={!selectedDate || !time.available}
                  className={`
                    group relative p-2 sm:p-3 rounded-lg text-center transition-all duration-300 ease-out hover:scale-[1.02] transform
                    ${
                      !selectedDate || !time.available
                        ? "opacity-50 cursor-not-allowed"
                        : selectedTime === time.time
                        ? "ring-2 ring-[#6bdcc0]"
                        : "hover:-translate-y-1"
                    }
                  `}
                  style={{
                    background:
                      selectedTime === time.time
                        ? "linear-gradient(135deg, rgba(107, 220, 192, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)"
                        : "rgba(30, 41, 59, 0.4)",
                    border:
                      selectedTime === time.time
                        ? "2px solid #6bdcc0"
                        : "2px solid rgba(107, 220, 192, 0.2)",
                    boxShadow:
                      selectedTime === time.time
                        ? "0 8px 32px rgba(107, 220, 192, 0.3)"
                        : "0 4px 16px rgba(107, 220, 192, 0.1)",
                  }}
                >
                  {/* Time Display - Compact */}
                  <div
                    className={`font-semibold text-xs sm:text-sm transition-colors duration-300 ${
                      selectedTime === time.time
                        ? "text-[#6bdcc0]"
                        : "text-white group-hover:text-[#6bdcc0]"
                    }`}
                  >
                    {time.display}
                  </div>

                  {/* Availability indicator - Staff gets slot counts, regular users get dots */}
                  {getTimeSlotDisplay(time)}

                  {/* Selection indicator */}
                  {selectedTime === time.time && (
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#6bdcc0] rounded-full flex items-center justify-center">
                        <svg
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-[#051028]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected DateTime Summary */}
      {selectedDate && selectedTime && (
        <div className="mb-8">
          <div
            className="p-6 rounded-2xl text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(107, 220, 192, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)",
              border: "2px solid rgba(107, 220, 192, 0.3)",
              boxShadow: "0 8px 32px rgba(107, 220, 192, 0.2)",
            }}
          >
            <h4 className="text-lg font-bold text-[#6bdcc0] mb-2">
              Selected Appointment
            </h4>
            <p className="text-white text-lg">
              {availableDates.find((d) => d.value === selectedDate)?.fullDate}{" "}
              at {timeSlots.find((t) => t.time === selectedTime)?.display}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <button
          onClick={onPrevious}
          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-[#6bdcc0] rounded-2xl transition-all duration-500 ease-out hover:scale-[1.02] shadow-xl focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 focus:ring-offset-2 focus:ring-offset-[#051028] transform hover:-translate-y-2 overflow-hidden backdrop-blur-sm"
          style={{
            background: "rgba(30, 41, 59, 0.4)",
            border: "2px solid #6bdcc0",
            boxShadow: "0 8px 32px rgba(107, 220, 192, 0.2)",
          }}
        >
          <svg
            className="w-5 h-5 mr-2 relative z-20 text-[#6bdcc0]"
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
          <span className="relative z-20 font-bold tracking-wide group-hover:text-[#051028] transition-all duration-500">
            Back to Services
          </span>

          {/* Hover Effects */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #6bdcc0 100%)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}
          ></div>
        </button>

        {canContinue && (
          <button
            onClick={onNext}
            className="group relative inline-flex items-center justify-center px-10 py-4 text-lg font-bold rounded-2xl transition-all duration-500 ease-out hover:scale-[1.02] shadow-xl focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 focus:ring-offset-2 focus:ring-offset-[#051028] transform hover:-translate-y-2 overflow-hidden backdrop-blur-sm"
            style={{
              background:
                "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)",
              boxShadow:
                "0 8px 32px rgba(107, 220, 192, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}
          >
            <span className="relative z-20 text-[#051028] group-hover:text-[#6bdcc0] transition-all duration-500 font-bold tracking-wide">
              Continue to Information
            </span>
            <svg
              className="w-5 h-5 ml-2 relative z-20 text-[#051028] group-hover:text-[#6bdcc0] transition-all duration-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>

            {/* Hover Effects */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-2xl"
              style={{
                background: "rgba(5, 16, 40, 0.95)",
                border: "2px solid #6bdcc0",
                boxShadow:
                  "0 0 20px rgba(107, 220, 192, 0.6), 0 0 40px rgba(107, 220, 192, 0.4)",
              }}
            ></div>
          </button>
        )}
      </div>
    </div>
  );
}
