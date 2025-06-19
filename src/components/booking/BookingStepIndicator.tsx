import React from "react";

interface BookingStepIndicatorProps {
  currentStep: number;
}

export default function BookingStepIndicator({
  currentStep,
}: BookingStepIndicatorProps) {
  const steps = [
    {
      number: 1,
      title: "Choose Service",
      description: "Select consultation type",
    },
    {
      number: 2,
      title: "Pick Date & Time",
      description: "Schedule your meeting",
    },
    {
      number: 3,
      title: "Your Information",
      description: "Complete your booking",
    },
  ];

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ease-out
                  ${
                    currentStep >= step.number
                      ? "text-[#051028]"
                      : "text-[#64748b] border-2 border-[#64748b]"
                  }
                `}
                style={
                  currentStep >= step.number
                    ? {
                        background:
                          "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)",
                        boxShadow: "0 4px 16px rgba(107, 220, 192, 0.4)",
                      }
                    : {}
                }
              >
                {currentStep > step.number ? (
                  <svg
                    className="w-6 h-6"
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
                ) : (
                  step.number
                )}

                {/* Glow effect for current step */}
                {currentStep === step.number && (
                  <div
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{
                      boxShadow:
                        "0 0 20px rgba(107, 220, 192, 0.6), 0 0 40px rgba(107, 220, 192, 0.4)",
                    }}
                  ></div>
                )}
              </div>

              {/* Step Text */}
              <div className="mt-4 text-center">
                <div
                  className={`font-semibold text-sm transition-colors duration-300 ${
                    currentStep >= step.number
                      ? "text-[#6bdcc0]"
                      : "text-[#64748b]"
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-xs text-[#64748b] mt-1 hidden sm:block">
                  {step.description}
                </div>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4 h-0.5 relative">
                <div className="absolute inset-0 bg-[#64748b] rounded-full"></div>
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-500 ease-out ${
                    currentStep > step.number ? "w-full" : "w-0"
                  }`}
                  style={{
                    background:
                      "linear-gradient(90deg, #6bdcc0 0%, #22d3ee 100%)",
                    boxShadow:
                      currentStep > step.number
                        ? "0 0 10px rgba(107, 220, 192, 0.5)"
                        : "none",
                  }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
