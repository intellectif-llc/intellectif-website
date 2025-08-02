"use client";

import React, { useState } from "react";
import BookingStepIndicator from "@/components/booking/BookingStepIndicator";
import ServiceSelection from "@/components/booking/ServiceSelection";
import DateTimeSelection from "@/components/booking/DateTimeSelection";
import CustomerInformation from "@/components/booking/CustomerInformation";
import PaymentStep from "@/components/booking/PaymentStep";

export interface BookingData {
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
    description: string;
    features: string[];
    popular?: boolean;
    slug: string;
    requiresPayment?: boolean;
  } | null;
  dateTime: {
    date: string;
    time: string;
  } | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    projectDescription: string;
    timezone: string;
  } | null;
}

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    service: null,
    dateTime: null,
    customer: null,
  });

  const totalSteps =
    bookingData.service?.price && bookingData.service.price > 0 ? 4 : 3;

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Clear subsequent step data when going back
      if (currentStep === 2) {
        // Going back from date selection, clear date/time
        setBookingData(prev => ({ ...prev, dateTime: null }));
      } else if (currentStep === 3) {
        // Going back from customer info, clear customer data
        setBookingData(prev => ({ ...prev, customer: null }));
      }
    }
  };

  const updateBookingData = (
    step: keyof BookingData,
    data: BookingData[keyof BookingData]
  ) => {
    setBookingData((prev) => ({
      ...prev,
      [step]: data,
    }));
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ServiceSelection
            selectedService={bookingData.service}
            onServiceSelect={(service: BookingData["service"]) =>
              updateBookingData("service", service)
            }
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            showBackButton={false} // No back button on first step
          />
        );
      case 2:
        return (
          <DateTimeSelection
            selectedDateTime={bookingData.dateTime}
            onDateTimeSelect={(dateTime: BookingData["dateTime"]) =>
              updateBookingData("dateTime", dateTime)
            }
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            serviceId={bookingData.service?.id}
          />
        );
      case 3:
        return (
          <CustomerInformation
            customerData={bookingData.customer}
            onCustomerDataUpdate={(customer) =>
              updateBookingData("customer", customer)
            }
            onPrevious={handlePreviousStep}
            onNext={handleNextStep} // Add onNext for paid services
            bookingData={bookingData}
          />
        );
      case 4:
        // Payment step for paid services
        return (
          <PaymentStep
            bookingData={bookingData}
            onPrevious={handlePreviousStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#051028] pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6bdcc0] opacity-5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0ea5e9] opacity-5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
            Book Your <span className="gradient-text">Consultation</span>
          </h1>
          <p className="text-xl text-[#64748b] max-w-3xl mx-auto">
            Schedule a meeting to discuss your project and discover how we can
            help transform your digital vision into reality.
          </p>
        </div>

        {/* Step Indicator */}
        <BookingStepIndicator currentStep={currentStep} />

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">{renderCurrentStep()}</div>
      </div>
    </div>
  );
}
