"use client";

import React from "react";
import Link from "next/link";

const PrivacyPolicyPage: React.FC = () => {
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
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <p className="text-xl text-[#64748b] max-w-4xl mx-auto leading-relaxed">
            At Intellectif LLC, we are committed to safeguarding your privacy.
            This Privacy Policy outlines the types of information we collect and
            how we protect your data.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 lg:p-12 border border-[#6bdcc0]/20 shadow-2xl space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                Introduction
              </h2>
              <p className="text-gray-300 leading-relaxed">
                At Intellectif LLC, we are committed to safeguarding your
                privacy. This Privacy Policy outlines the types of information
                we collect from our users, how we use this information, and the
                measures we take to ensure your data is protected. By using our
                website, you consent to the data practices described in this
                policy.
              </p>
            </section>

            {/* Information Collection and Use */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                Information Collection and Use
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We collect personal information from our users solely for the
                purpose of offering superior customer support and enhancing your
                experience with our services. This information may include, but
                is not limited to, your name, email address, phone number, and
                any other details you provide to us voluntarily.
              </p>
            </section>

            {/* Data Usage */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                Data Usage
              </h2>
              <p className="text-gray-300 mb-4">
                The information we collect is used exclusively to:
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#6bdcc0] rounded-full mt-2 flex-shrink-0"></div>
                  <span>
                    Provide and improve our customer support services.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#6bdcc0] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Personalize your experience on our website.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#6bdcc0] rounded-full mt-2 flex-shrink-0"></div>
                  <span>
                    Respond to your inquiries and fulfill your requests
                    efficiently.
                  </span>
                </li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                Data Security
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We take your privacy and data security seriously. We implement
                industry-standard security measures to protect your personal
                information from unauthorized access, use, or disclosure.
              </p>
            </section>

            {/* Data Deletion */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                Data Deletion
              </h2>
              <p className="text-gray-300 leading-relaxed">
                If you wish to have your personal information removed from our
                database, you may request deletion by contacting us at{" "}
                <a
                  href="mailto:contact@intellectif.com"
                  className="text-[#6bdcc0] hover:text-[#22d3ee] transition-colors duration-300 underline"
                >
                  contact@intellectif.com
                </a>
                . We commit to processing your request and deleting your
                information within 24 hours of receipt.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                Changes to This Privacy Policy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy periodically to reflect
                changes in our practices or for other operational, legal, or
                regulatory reasons. We encourage you to review this policy
                regularly to stay informed about how we are protecting your
                information.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                Contact Us
              </h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions or concerns about this Privacy Policy
                or our data practices, please contact us at{" "}
                <a
                  href="mailto:contact@intellectif.com"
                  className="text-[#6bdcc0] hover:text-[#22d3ee] transition-colors duration-300 underline"
                >
                  contact@intellectif.com
                </a>
                .
              </p>
            </section>

            {/* Additional Privacy Information */}
            <section className="bg-[#051028] bg-opacity-50 rounded-2xl p-6 border border-[#6bdcc0]/10">
              <h3 className="text-xl font-semibold text-[#6bdcc0] mb-4">
                Your Privacy Rights
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl mb-2">🔒</div>
                  <h4 className="font-semibold text-white mb-2">
                    Secure Storage
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Your data is encrypted and stored using industry-standard
                    security protocols
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">⚡</div>
                  <h4 className="font-semibold text-white mb-2">
                    Quick Deletion
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Request data removal and we'll process it within 24 hours
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="font-semibold text-white mb-2">
                    Purpose-Limited
                  </h4>
                  <p className="text-gray-300 text-sm">
                    We only collect data necessary for providing our services
                  </p>
                </div>
              </div>
            </section>

            {/* Last Updated */}
            <div className="pt-8 border-t border-[#6bdcc0]/20">
              <p className="text-sm text-gray-500 text-center">
                Last updated:{" "}
                {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Navigation Back */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#6bdcc0] hover:text-[#22d3ee] transition-colors duration-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
