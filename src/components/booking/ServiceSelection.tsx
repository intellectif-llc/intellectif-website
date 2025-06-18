import React from "react";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  features: string[];
  popular?: boolean;
}

interface ServiceSelectionProps {
  selectedService: Service | null;
  onServiceSelect: (service: Service) => void;
  onNext: () => void;
}

const services: Service[] = [
  {
    id: "free-discovery",
    name: "Free Project Discovery",
    price: 0,
    duration: 15,
    description:
      "Perfect for initial project exploration and lead qualification. We'll discuss your vision and provide preliminary guidance.",
    features: [
      "15-minute online consultation",
      "Project scope discussion",
      "Technology recommendations",
      "Next steps guidance",
      "No commitment required",
    ],
  },
  {
    id: "paid-consultation",
    name: "Technical Strategy Consultation",
    price: 150,
    duration: 60,
    description:
      "Comprehensive technical consultation with actionable deliverables. Get a detailed strategic roadmap for your project.",
    features: [
      "60-minute deep-dive session",
      "Detailed technical analysis",
      "Strategic roadmap document",
      "Architecture recommendations",
      "Timeline & budget estimates",
      "Follow-up report (24-48h)",
    ],
    popular: true,
  },
];

export default function ServiceSelection({
  selectedService,
  onServiceSelect,
  onNext,
}: ServiceSelectionProps) {
  const handleServiceSelect = (service: Service) => {
    onServiceSelect(service);
  };

  return (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Choose Your Consultation Type
        </h2>
        <p className="text-lg text-[#64748b] max-w-2xl mx-auto">
          Select the consultation that best fits your needs. Both options
          include expert guidance tailored to your project.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {services.map((service) => (
          <div
            key={service.id}
            className={`
              group relative p-8 rounded-2xl cursor-pointer transition-all duration-500 ease-out transform hover:scale-[1.02] hover:-translate-y-2
              ${
                selectedService?.id === service.id
                  ? "ring-4 ring-[#6bdcc0]/50"
                  : "hover:shadow-2xl"
              }
            `}
            style={{
              background:
                selectedService?.id === service.id
                  ? "linear-gradient(135deg, rgba(107, 220, 192, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)"
                  : "rgba(30, 41, 59, 0.4)",
              border:
                selectedService?.id === service.id
                  ? "2px solid #6bdcc0"
                  : "2px solid rgba(107, 220, 192, 0.2)",
              boxShadow:
                selectedService?.id === service.id
                  ? "0 8px 32px rgba(107, 220, 192, 0.3), 0 0 20px rgba(107, 220, 192, 0.2)"
                  : "0 8px 32px rgba(107, 220, 192, 0.1)",
            }}
            onClick={() => handleServiceSelect(service)}
          >
            {/* Popular Badge */}
            {service.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div
                  className="px-4 py-2 rounded-full text-sm font-bold text-[#051028]"
                  style={{
                    background:
                      "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 100%)",
                    boxShadow: "0 4px 16px rgba(107, 220, 192, 0.4)",
                  }}
                >
                  Most Popular
                </div>
              </div>
            )}

            {/* Selection Indicator */}
            <div className="absolute top-6 right-6">
              <div
                className={`w-6 h-6 rounded-full border-2 transition-all duration-300 ${
                  selectedService?.id === service.id
                    ? "bg-[#6bdcc0] border-[#6bdcc0]"
                    : "border-[#64748b] group-hover:border-[#6bdcc0]"
                }`}
              >
                {selectedService?.id === service.id && (
                  <svg
                    className="w-4 h-4 text-[#051028] absolute top-0.5 left-0.5"
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
                )}
              </div>
            </div>

            {/* Service Header */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">
                {service.name}
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-[#6bdcc0]">
                  {service.price === 0 ? "Free" : `$${service.price}`}
                </span>
                <span className="text-[#64748b]">/ {service.duration} min</span>
              </div>
              <p className="text-[#64748b] leading-relaxed">
                {service.description}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-3">
              {service.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-[#6bdcc0] mt-0.5 flex-shrink-0"
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
                  <span className="text-[#64748b] text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {/* Hover Glow Effect */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                boxShadow:
                  "0 0 30px rgba(107, 220, 192, 0.3), 0 0 60px rgba(107, 220, 192, 0.1)",
              }}
            ></div>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      {selectedService && (
        <div className="text-center">
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
              Continue to Date Selection
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

            <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700">
              <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
