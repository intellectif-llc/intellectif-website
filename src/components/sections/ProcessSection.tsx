"use client";

import React from "react";
import { PROCESS_STEPS } from "@/constants/services";
import Button from "@/components/ui/Button";

const ProcessSection: React.FC = () => {
  const getStepIcon = (iconName: string) => {
    switch (iconName) {
      case "calendar":
        return (
          <svg
            className="w-6 h-6"
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
        );
      case "checklist":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        );
      case "code":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        );
      case "lightbulb":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        );
    }
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            How We Bring Your Vision to Life in{" "}
            <span className="gradient-text">4 Easy Steps</span>
          </h2>
          <p className="text-xl text-cool-gray max-w-3xl mx-auto">
            Our proven process ensures your project is delivered on time, within
            budget, and exceeds expectations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {PROCESS_STEPS.map((step) => (
            <div
              key={step.id}
              className="text-center transition-transform duration-300 ease-in-out hover:-translate-y-2"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-slate-blue rounded-full flex items-center justify-center text-brand-teal border-2 border-brand-teal/30 transition-all duration-300 group-hover:bg-gradient-to-r from-brand-teal to-neon-cyan group-hover:text-midnight-navy">
                {getStepIcon(step.icon)}
              </div>
              <div className="mb-4">
                <span className="text-sm font-semibold text-brand-teal uppercase tracking-wider">
                  Step {step.id}
                </span>
                <h3 className="text-xl font-bold text-white mt-2">
                  {step.title}
                </h3>
              </div>
              <p className="text-cool-gray leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Ready to get started?
          </h3>
          <p className="text-cool-gray text-lg mb-8 max-w-2xl mx-auto">
            Let&apos;s discuss your project and see how we can help bring your
            vision to life.
          </p>
          <Button variant="primary" size="lg" href="/contact">
            Start Your Project Today
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
