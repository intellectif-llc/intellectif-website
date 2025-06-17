"use client";

import React, { useEffect, useState } from "react";

const HeroSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
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

      <div className="container mx-auto px-4 text-center relative z-10">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="block text-white mb-2">
              Transform Your Digital
            </span>
            <span className="block gradient-text">Vision Into Reality</span>
          </h1>

          <p className="text-xl md:text-2xl text-[#64748b] mb-8 max-w-3xl mx-auto leading-relaxed">
            We specialize in cutting-edge web development, cloud solutions, and
            AI integration to help your business thrive in the digital
            landscape.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-[#051028] bg-[#6bdcc0] hover:bg-[#5ac5b0] rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6bdcc0]"
            >
              Start Your Project
            </a>
            <a
              href="/solutions"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-[#6bdcc0] bg-transparent border-2 border-[#6bdcc0] rounded-xl transition-all duration-300 hover:bg-[#6bdcc0] hover:text-[#051028] hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6bdcc0]"
            >
              View Our Solutions
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
