import React, { useState, useEffect } from "react";
import { AvailableDate } from "@/hooks/useBookingData";
import CalendarSkeleton from "./CalendarSkeleton";

interface CalendarProps {
  availableDates: AvailableDate[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  loading?: boolean;
}

export default function Calendar({
  availableDates,
  selectedDate,
  onDateSelect,
  loading = false,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  // Auto-navigate to first available month if current month has no availability
  useEffect(() => {
    if (availableDates.length > 0) {
      const currentMonthHasAvailability = availableDates.some(date => {
        const dateObj = new Date(date.value);
        return dateObj.getMonth() === currentMonth.month && dateObj.getFullYear() === currentMonth.year;
      });

      if (!currentMonthHasAvailability) {
        // Find the first available date and navigate to that month
        const firstAvailableDate = new Date(availableDates[0].value);
        setCurrentMonth({
          month: firstAvailableDate.getMonth(),
          year: firstAvailableDate.getFullYear()
        });
      }
    }
  }, [availableDates, currentMonth.month, currentMonth.year]);

  // Generate calendar days for current view
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentMonth.year, currentMonth.month, 1);
    const lastDayOfMonth = new Date(currentMonth.year, currentMonth.month + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

    const calendarDays = [];
    const totalDays = 42; // 6 weeks * 7 days

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      calendarDays.push(date);
    }

    return calendarDays;
  };

  const calendarDays = generateCalendarDays();

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month === 0 ? 11 : prev.month - 1;
      const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
      return { month: newMonth, year: newYear };
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month === 11 ? 0 : prev.month + 1;
      const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
      return { month: newMonth, year: newYear };
    });
  };

  // Check if navigation should be enabled
  const now = new Date();
  const canGoToPrevious = currentMonth.year > now.getFullYear() || 
    (currentMonth.year === now.getFullYear() && currentMonth.month > now.getMonth());
  
  // Allow next month navigation if we have available dates in the next month
  const nextMonth = currentMonth.month === 11 ? 0 : currentMonth.month + 1;
  const nextYear = currentMonth.month === 11 ? currentMonth.year + 1 : currentMonth.year;
  const hasNextMonthDates = availableDates.some(date => {
    const dateObj = new Date(date.value);
    return dateObj.getMonth() === nextMonth && dateObj.getFullYear() === nextYear;
  });

  // Create a map for quick lookup of available dates
  const availableDateMap = new Map(
    availableDates.map((date) => [date.value, date])
  );

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatDateValue = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.month && date.getFullYear() === currentMonth.year;
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  if (loading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="bg-[rgba(30,41,59,0.4)] border-2 border-[rgba(107,220,192,0.2)] rounded-2xl p-6">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          disabled={!canGoToPrevious}
          className={`p-2 rounded-lg transition-all duration-200 ${
            canGoToPrevious
              ? "text-[#6bdcc0] hover:bg-[#6bdcc0]/10 hover:scale-110"
              : "text-[#64748b]/50 cursor-not-allowed"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-xl font-bold text-white">
          {monthNames[currentMonth.month]} {currentMonth.year}
        </h3>
        
        <button
          onClick={goToNextMonth}
          disabled={!hasNextMonthDates}
          className={`p-2 rounded-lg transition-all duration-200 ${
            hasNextMonthDates
              ? "text-[#6bdcc0] hover:bg-[#6bdcc0]/10 hover:scale-110"
              : "text-[#64748b]/50 cursor-not-allowed"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-[#64748b] py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const dateValue = formatDateValue(date);
          const availableDate = availableDateMap.get(dateValue);
          const isAvailable = !!availableDate;
          const isSelected = selectedDate === dateValue;
          const isTodayDate = isToday(date);
          const isInCurrentMonth = isCurrentMonth(date);

          return (
            <button
              key={index}
              onClick={() => isAvailable && onDateSelect(dateValue)}
              disabled={!isAvailable || !isInCurrentMonth || isPastDate(date)}
              className={`
                relative h-12 w-full rounded-lg text-sm font-medium transition-all duration-300 ease-out
                ${!isInCurrentMonth 
                  ? "text-[#64748b]/30 cursor-not-allowed" 
                  : isPastDate(date)
                    ? "text-[#64748b]/30 cursor-not-allowed"
                    : isAvailable
                      ? isSelected
                        ? "text-[#051028] transform scale-105"
                        : "text-white hover:text-[#6bdcc0] hover:scale-105"
                      : "text-[#64748b]/50 cursor-not-allowed"
                }
                ${isTodayDate && isInCurrentMonth ? "ring-1 ring-[#6bdcc0]/50" : ""}
              `}
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 100%)"
                  : isAvailable && isInCurrentMonth
                    ? "rgba(107, 220, 192, 0.1)"
                    : "transparent",
                boxShadow: isSelected
                  ? "0 4px 16px rgba(107, 220, 192, 0.4)"
                  : "none",
              }}
            >
              <span className="relative z-10">{date.getDate()}</span>
              
              {/* Available indicator */}
              {isAvailable && isInCurrentMonth && !isSelected && !isPastDate(date) && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-1.5 h-1.5 bg-[#6bdcc0] rounded-full opacity-60"></div>
                </div>
              )}

              {/* Today indicator */}
              {isTodayDate && isInCurrentMonth && !isSelected && (
                <div className="absolute top-1 right-1">
                  <div className="w-1.5 h-1.5 bg-[#6bdcc0] rounded-full"></div>
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <svg
                    className="w-3 h-3 text-[#051028]"
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
              )}
            </button>
          );
        })}
      </div>

      {/* Legend and Info */}
      <div className="mt-4">
        <div className="flex items-center justify-center gap-6 text-xs text-[#64748b] mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#6bdcc0] rounded-full opacity-60"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#6bdcc0] rounded-full"></div>
            <span>Today</span>
          </div>
        </div>
        
        {/* Show navigation hint if viewing different month */}
        {(currentMonth.month !== new Date().getMonth() || currentMonth.year !== new Date().getFullYear()) && (
          <div className="text-center text-xs text-[#64748b] mt-2">
            <span>Use ← → to navigate between months</span>
          </div>
        )}
      </div>
    </div>
  );
}