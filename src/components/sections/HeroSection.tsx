"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

const HeroSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-teal opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-electric-blue opacity-10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-neon-cyan opacity-5 rounded-full blur-3xl animate-pulse"
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

          <p className="text-xl md:text-2xl text-cool-gray mb-8 max-w-3xl mx-auto leading-relaxed">
            We specialize in cutting-edge web development, cloud solutions, and
            AI integration to help your business thrive in the digital
            landscape.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="primary" size="lg" href="/contact">
              Start Your Project
            </Button>
            <Button variant="outline" size="lg" href="/solutions">
              View Our Solutions
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
