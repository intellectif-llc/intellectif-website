import React from "react";
import Skeleton from "../ui/Skeleton";

export default function TimeSlotsSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 mb-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="group relative p-2 sm:p-3 rounded-lg text-center transition-all duration-300 ease-out"
            style={{
              background: "rgba(30, 41, 59, 0.4)",
              border: "2px solid rgba(107, 220, 192, 0.2)",
              boxShadow: "0 4px 16px rgba(107, 220, 192, 0.1)",
            }}
          >
            {/* Time Display Skeleton */}
            <Skeleton className="w-16 h-4 rounded mx-auto mb-1" />
          </div>
        ))}
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-[#6bdcc0] text-sm">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading time slots...</span>
        </div>
      </div>
    </div>
  );
}