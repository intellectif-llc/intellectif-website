"use client";

import React, { useEffect, useState } from "react";

const HeroSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20 md:pt-0">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6bdcc0] opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0ea5e9] opacity-10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#22d3ee] opacity-5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-tight px-2">
            <span className="block text-white mb-2 sm:mb-4">Do More</span>
            <span className="block gradient-text">
              With The Team You Already Have
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl md:text-2xl text-[#8798b0] mb-8 sm:mb-10 md:mb-12 max-w-3xl mx-auto leading-relaxed px-4"
            style={{
              textShadow: `
                0 2px 8px rgba(5, 16, 40, 0.8),
                0 4px 16px rgba(5, 16, 40, 0.6),
                0 0 20px rgba(107, 220, 192, 0.15),
                0 0 40px rgba(107, 220, 192, 0.1)
              `,
            }}
          >
            We automate the day-to-day, so you can focus on the big picture.
            It's time to build a more profitable and enjoyable business for you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4">
            <a
              href="/booking"
              className="group relative inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 py-4 text-base sm:text-lg font-bold rounded-2xl transition-all duration-500 ease-out hover:scale-[1.02] shadow-xl focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 focus:ring-offset-2 focus:ring-offset-[#051028] transform hover:-translate-y-2 overflow-hidden border-2 border-transparent hover:border-[#6bdcc0] hover:shadow-2xl backdrop-blur-sm"
              style={{
                background:
                  "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)",
                boxShadow:
                  "0 8px 32px rgba(107, 220, 192, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              }}
            >
              <span className="relative z-20 text-[#051028] transition-all duration-500 group-hover:text-[#6bdcc0] font-bold tracking-wide drop-shadow-sm">
                Start Your Project
              </span>

              {/* Main gradient background */}
              <div
                className="absolute inset-0 opacity-100 group-hover:opacity-0 transition-all duration-500 ease-out rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)",
                }}
              ></div>

              {/* Hover state: Glowing border with subtle inner glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out"
                style={{
                  background: "rgba(5, 16, 40, 0.95)",
                  border: "2px solid #6bdcc0",
                  boxShadow: `
                    0 0 20px rgba(107, 220, 192, 0.6),
                    0 0 40px rgba(107, 220, 192, 0.4),
                    inset 0 0 20px rgba(107, 220, 192, 0.1),
                    0 8px 32px rgba(34, 211, 238, 0.3)
                  `,
                }}
              ></div>

              {/* Subtle animated shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700">
                <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </a>

            <a
              href="/solutions"
              className="group relative inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 py-4 text-base sm:text-lg font-bold text-[#6bdcc0] rounded-2xl transition-all duration-500 ease-out hover:scale-[1.02] shadow-xl focus:outline-none focus:ring-4 focus:ring-[#6bdcc0]/30 focus:ring-offset-2 focus:ring-offset-[#051028] transform hover:-translate-y-2 overflow-hidden border-2 backdrop-blur-sm"
              style={{
                background: "rgba(30, 41, 59, 0.4)",
                border: "2px solid #6bdcc0",
                boxShadow:
                  "0 8px 32px rgba(107, 220, 192, 0.2), inset 0 1px 0 rgba(107, 220, 192, 0.1)",
              }}
            >
              <span className="relative z-20 transition-all duration-500 group-hover:text-[#051028] font-bold tracking-wide drop-shadow-sm">
                View Our Solutions
              </span>

              {/* Hover fill gradient */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #6bdcc0 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                }}
              ></div>

              {/* Enhanced glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out pointer-events-none"
                style={{
                  boxShadow: `
                    0 0 30px rgba(34, 211, 238, 0.8),
                    0 0 60px rgba(34, 211, 238, 0.4),
                    0 8px 32px rgba(14, 165, 233, 0.4)
                  `,
                }}
              ></div>

              {/* Subtle animated shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
                <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
