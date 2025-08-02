import React from "react";
import Skeleton from "../ui/Skeleton";

export default function CalendarSkeleton() {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-[rgba(30,41,59,0.4)] border-2 border-[rgba(107,220,192,0.2)] rounded-2xl p-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="w-6 h-6 rounded-lg" />
        <Skeleton className="w-32 h-6 rounded" />
        <Skeleton className="w-6 h-6 rounded-lg" />
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-[#64748b] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>

      {/* Loading Indicator */}
      <div className="mt-4">
        <div className="flex items-center justify-center gap-6 mb-2">
          <Skeleton className="w-16 h-4 rounded" />
          <Skeleton className="w-12 h-4 rounded" />
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-[#6bdcc0] text-sm">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading availability...</span>
          </div>
        </div>
      </div>
    </div>
  );
}