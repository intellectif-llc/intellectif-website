"use client";

import React from "react";
import { TECH_STACK } from "@/constants/services";
import TechStackItem from "./TechStackItem";

const TechStackSection: React.FC = () => {
  const duplicatedTechStack = [...TECH_STACK, ...TECH_STACK];

  return (
    <section className="py-20 bg-[#1e293b]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Our <span className="gradient-text">Tech Stack</span>
          </h2>
          <p className="text-xl text-[#64748b] max-w-4xl mx-auto leading-relaxed">
            We use cutting-edge technologies and frameworks to build robust,
            scalable solutions. Our expertise spans across{" "}
            <span className="text-[#6bdcc0] font-semibold">
              cloud platforms
            </span>
            ,{" "}
            <span className="text-[#6bdcc0] font-semibold">
              modern frameworks
            </span>
            , and{" "}
            <span className="text-[#6bdcc0] font-semibold">databases</span> to
            ensure your project is built with the best tools available.
          </p>
        </div>

        <div className="relative w-full overflow-hidden">
          {/* Gradient overlays for smooth fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#1e293b] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#1e293b] to-transparent z-10 pointer-events-none"></div>

          <div className="flex flex-nowrap animate-techStackSlide will-change-transform">
            {duplicatedTechStack.map((tech, index) => (
              <TechStackItem
                key={`${tech.name}-${index}`}
                name={tech.name}
                icon={tech.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
