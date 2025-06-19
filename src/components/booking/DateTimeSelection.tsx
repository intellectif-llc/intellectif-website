import React, { useState } from "react";

interface DateTimeSelectionProps {
  selectedDateTime: { date: string; time: string } | null;
  onDateTimeSelect: (dateTime: { date: string; time: string }) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function DateTimeSelection({
  selectedDateTime,
  onDateTimeSelect,
  onNext,
  onPrevious,
}: DateTimeSelectionProps) {
  const [selectedDate, setSelectedDate] = useState(
    selectedDateTime?.date || ""
  );
  const [selectedTime, setSelectedTime] = useState(
    selectedDateTime?.time || ""
  );

  // Generate next 14 days (excluding weekends for business meetings)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    while (dates.length < 10) {
      const dayOfWeek = currentDate.getDay();
      // Only include weekdays (Monday = 1, Friday = 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push({
          value: currentDate.toISOString().split("T")[0],
          display: currentDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          fullDate: currentDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  // Available time slots (business hours)
  const timeSlots = [
    { value: "09:00", display: "9:00 AM" },
    { value: "10:00", display: "10:00 AM" },
    { value: "11:00", display: "11:00 AM" },
    { value: "14:00", display: "2:00 PM" },
    { value: "15:00", display: "3:00 PM" },
    { value: "16:00", display: "4:00 PM" },
    { value: "17:00", display: "5:00 PM" },
  ];

  const availableDates = generateAvailableDates();

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

      <div className="grid lg:grid-cols-2 gap-12 mb-12">
        {/* Date Selection */}
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Select Date
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {availableDates.map((date) => (
              <button
                key={date.value}
                onClick={() => handleDateSelect(date.value)}
                className={`
                  group relative p-4 rounded-xl text-left transition-all duration-300 ease-out hover:scale-[1.02] transform
                  ${
                    selectedDate === date.value
                      ? "ring-2 ring-[#6bdcc0]"
                      : "hover:-translate-y-1"
                  }
                `}
                style={{
                  background:
                    selectedDate === date.value
                      ? "linear-gradient(135deg, rgba(107, 220, 192, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)"
                      : "rgba(30, 41, 59, 0.4)",
                  border:
                    selectedDate === date.value
                      ? "2px solid #6bdcc0"
                      : "2px solid rgba(107, 220, 192, 0.2)",
                  boxShadow:
                    selectedDate === date.value
                      ? "0 8px 32px rgba(107, 220, 192, 0.3)"
                      : "0 4px 16px rgba(107, 220, 192, 0.1)",
                }}
              >
                <div
                  className={`font-semibold transition-colors duration-300 ${
                    selectedDate === date.value
                      ? "text-[#6bdcc0]"
                      : "text-white group-hover:text-[#6bdcc0]"
                  }`}
                >
                  {date.display}
                </div>
                <div className="text-sm text-[#64748b] mt-1">Available</div>

                {/* Selection indicator */}
                {selectedDate === date.value && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 bg-[#6bdcc0] rounded-full flex items-center justify-center">
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
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
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
          <div className="grid grid-cols-2 gap-3">
            {timeSlots.map((time) => (
              <button
                key={time.value}
                onClick={() => handleTimeSelect(time.value)}
                disabled={!selectedDate}
                className={`
                  group relative p-4 rounded-xl text-left transition-all duration-300 ease-out hover:scale-[1.02] transform
                  ${
                    !selectedDate
                      ? "opacity-50 cursor-not-allowed"
                      : selectedTime === time.value
                      ? "ring-2 ring-[#6bdcc0]"
                      : "hover:-translate-y-1"
                  }
                `}
                style={{
                  background:
                    selectedTime === time.value
                      ? "linear-gradient(135deg, rgba(107, 220, 192, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)"
                      : "rgba(30, 41, 59, 0.4)",
                  border:
                    selectedTime === time.value
                      ? "2px solid #6bdcc0"
                      : "2px solid rgba(107, 220, 192, 0.2)",
                  boxShadow:
                    selectedTime === time.value
                      ? "0 8px 32px rgba(107, 220, 192, 0.3)"
                      : "0 4px 16px rgba(107, 220, 192, 0.1)",
                }}
              >
                <div
                  className={`font-semibold transition-colors duration-300 ${
                    selectedTime === time.value
                      ? "text-[#6bdcc0]"
                      : "text-white group-hover:text-[#6bdcc0]"
                  }`}
                >
                  {time.display}
                </div>
                <div className="text-sm text-[#64748b] mt-1">Available</div>

                {/* Selection indicator */}
                {selectedTime === time.value && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 bg-[#6bdcc0] rounded-full flex items-center justify-center">
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
                  </div>
                )}
              </button>
            ))}
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
              at {timeSlots.find((t) => t.value === selectedTime)?.display}
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
          <span className="relative z-20 font-bold tracking-wide">
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
            <span className="relative z-20 text-[#051028] font-bold tracking-wide">
              Continue to Information
            </span>
            <svg
              className="w-5 h-5 ml-2 relative z-20 text-[#051028]"
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
