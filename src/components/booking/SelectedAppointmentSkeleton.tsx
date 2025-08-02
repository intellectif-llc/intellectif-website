import React from "react";
import Skeleton from "../ui/Skeleton";

export default function SelectedAppointmentSkeleton() {
  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between p-4 rounded-xl border-2"
        style={{
          background: "linear-gradient(135deg, rgba(107, 220, 192, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)",
          border: "2px solid rgba(107, 220, 192, 0.3)",
          boxShadow: "0 4px 16px rgba(107, 220, 192, 0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div>
            <Skeleton className="w-32 h-4 rounded mb-1" />
            <Skeleton className="w-48 h-5 rounded" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="w-20 h-3 rounded" />
        </div>
      </div>
    </div>
  );
}