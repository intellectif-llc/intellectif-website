"use client";

import React, { useState } from "react";
import Image from "next/image";
import { SERVICES, ServiceItem } from "@/constants/services";
import Button from "../ui/Button";

interface ServiceModalProps {
  service: ServiceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

function ServiceModal({ service, isOpen, onClose }: ServiceModalProps) {
  if (!service || !isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop overflow-y-auto py-10"
      onClick={onClose}
    >
      <div
        className="modal-content p-6 sm:p-8 rounded-xl max-w-2xl w-full mx-4 my-auto transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl font-bold text-white">{service.title}</h3>
          <button
            onClick={onClose}
            className="group relative w-10 h-10 rounded-lg flex items-center justify-center text-[#64748b] transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-0.5 transform overflow-hidden"
          >
            <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee] to-[#0ea5e9] opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out rounded-lg"></div>
          </button>
        </div>
        <div className="mb-6">
          <Image
            src={service.icon}
            alt={service.title}
            width={64}
            height={64}
            className="w-16 h-16 object-contain"
          />
        </div>
        <p className="text-[#64748b] text-lg mb-6 leading-relaxed">
          {service.fullDescription || service.details}
        </p>
        {service.features && (
          <div className="mb-6">
            <h4 className="text-xl font-semibold text-[#6bdcc0] mb-4">
              Key Features:
            </h4>
            <ul className="space-y-2">
              {service.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start text-[#64748b]">
                  <svg
                    className="w-4 h-4 text-[#6bdcc0] mr-3 mt-1 flex-shrink-0"
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
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={onClose}>Get Started</Button>
        </div>
      </div>
    </div>
  );
}

const ServicesSection: React.FC = () => {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    null
  );

  const openModal = (service: ServiceItem) => {
    setSelectedService(service);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setSelectedService(null);
    document.body.style.overflow = "auto";
  };

  return (
    <>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              What We <span className="gradient-text">Offer</span>
            </h2>
            <p className="text-xl text-[#64748b] max-w-3xl mx-auto">
              Comprehensive digital solutions tailored to your business needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((service, index) => (
              <div
                key={index}
                className="p-8 rounded-xl cursor-pointer group transition-all duration-300 ease-in-out bg-[#1e293b]/50 border border-[#6bdcc0]/10 hover:-translate-y-2 hover:bg-[#1e293b]/80 hover:border-[#6bdcc0]/30 hover:shadow-2xl"
                onClick={() => openModal(service)}
              >
                <div className="mb-6">
                  <Image
                    src={service.icon}
                    alt={service.title}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-[#6bdcc0] transition-colors">
                  {service.title}
                </h3>
                <p className="text-[#64748b] leading-relaxed mb-6">
                  {service.description}
                </p>
                <div className="flex items-center text-[#6bdcc0] font-semibold">
                  <span>Learn More</span>
                  <svg
                    className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Modal */}
      {selectedService && (
        <ServiceModal
          service={selectedService}
          isOpen={true}
          onClose={closeModal}
        />
      )}
    </>
  );
};

export default ServicesSection;
