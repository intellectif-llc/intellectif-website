import React from "react";
import { AvailableDate, TimeSlot } from "@/hooks/useBookingData";

interface SelectedAppointmentProps {
  selectedDate: string;
  selectedTime: string;
  availableDates: AvailableDate[];
  timeSlots: TimeSlot[];
}

export default function SelectedAppointment({
  selectedDate,
  selectedTime,
  availableDates,
  timeSlots,
}: SelectedAppointmentProps) {
  const selectedDateInfo = availableDates.find((d) => d.value === selectedDate);
  const selectedTimeInfo = timeSlots.find((t) => t.time === selectedTime);

  if (!selectedDate || !selectedTime || !selectedDateInfo || !selectedTimeInfo) {
    return null;
  }

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
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#6bdcc0]">
            <svg
              className="w-4 h-4 text-[#051028]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-[#6bdcc0]">Selected Appointment</div>
            <div className="text-white font-semibold">
              {selectedDateInfo.fullDate} at {selectedTimeInfo.display}
            </div>
          </div>
        </div>
        <div className="text-xs text-[#64748b] text-right">
          <div>Ready to continue</div>
        </div>
      </div>
    </div>
  );
}