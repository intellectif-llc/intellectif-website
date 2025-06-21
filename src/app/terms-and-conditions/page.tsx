"use client";

import React from "react";
import Link from "next/link";

const TermsAndConditionsPage: React.FC = () => {
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
            Terms and <span className="gradient-text">Conditions</span>
          </h1>
          <p className="text-xl text-[#64748b] max-w-4xl mx-auto leading-relaxed">
            Welcome to Intellectif! These Terms and Conditions outline the rules
            and regulations for the use of Intellectif's website, products, and
            services. By accessing or using our services, you accept these terms
            in full.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 lg:p-12 border border-[#6bdcc0]/20 shadow-2xl space-y-8">
            {/* Section 1: Definitions */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                1. Definitions
              </h2>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#6bdcc0] rounded-full mt-2 flex-shrink-0"></div>
                  <span>
                    <strong className="text-white">"Company"</strong> refers to
                    Intellectif LLC, a registered business operating from Latin
                    America with a virtual office in Miami, FL.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#6bdcc0] rounded-full mt-2 flex-shrink-0"></div>
                  <span>
                    <strong className="text-white">"Client"</strong> refers to
                    any person or entity using or engaging with Intellectif's
                    services.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#6bdcc0] rounded-full mt-2 flex-shrink-0"></div>
                  <span>
                    <strong className="text-white">"Services"</strong> refers to
                    all IT-related and business consulting services offered by
                    Intellectif, including but not limited to Web Development,
                    Backend Development, AWS Cloud Consulting, Mobile App
                    Development, Digital Marketing, and AI systems
                    implementation.
                  </span>
                </li>
              </ul>
            </section>

            {/* Section 2: Service Agreement */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                2. Service Agreement
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  Intellectif agrees to provide the services as detailed in the
                  agreed proposal or contract. The client agrees to provide all
                  necessary information and resources required to complete the
                  services. Any delays caused by the client may result in the
                  extension of agreed timelines.
                </p>
                <p>
                  Changes to the scope of services after project commencement
                  may result in adjustments to costs and delivery timelines. All
                  changes will be communicated and agreed upon in writing before
                  proceeding.
                </p>
              </div>
            </section>

            {/* Section 3: Payment Terms */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                3. Payment Terms
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  Payment for services must be made according to the agreed
                  pricing plan outlined in the contract or proposal. Intellectif
                  offers flexible payment models, including fixed-price
                  projects, hourly rates, and retainer agreements. Invoices will
                  be issued as per the terms set forth in the contract.
                </p>
                <p>
                  Late payments may incur a 5% late fee if not settled within 15
                  days of the due date. We reserve the right to suspend or
                  terminate services in cases of non-payment.
                </p>
                <p>
                  For long-term projects, we may require upfront payment or
                  payment in milestones, which will be outlined in the project
                  proposal.
                </p>
              </div>
            </section>

            {/* Section 4: Ownership and Intellectual Property */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                4. Ownership and Intellectual Property
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  Upon full payment for the completed project, all intellectual
                  property rights, including source code, documentation, and
                  deliverables, will be transferred to the client. Intellectif
                  retains the right to display the work in its portfolio unless
                  otherwise agreed in writing.
                </p>
                <p>
                  Until full payment is made, Intellectif retains ownership of
                  all intellectual property related to the services provided.
                </p>
              </div>
            </section>

            {/* Section 5: Confidentiality */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                5. Confidentiality
              </h2>
              <p className="text-gray-300">
                Both parties agree to maintain strict confidentiality concerning
                any proprietary information, trade secrets, or sensitive
                business data disclosed during the course of the project.
                Confidential information will not be shared with third parties
                without prior written consent.
              </p>
            </section>

            {/* Section 6: Data Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                6. Data Privacy
              </h2>
              <p className="text-gray-300">
                Intellectif is committed to safeguarding your data. We comply
                with all applicable data privacy laws and use secure practices
                to protect your sensitive business information. For more
                details, please refer to our{" "}
                <Link
                  href="/privacy"
                  className="text-[#6bdcc0] hover:text-[#22d3ee] transition-colors duration-300 underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            {/* Section 7: Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                7. Limitation of Liability
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  While we strive to deliver the highest quality services,
                  Intellectif is not liable for any indirect, incidental, or
                  consequential damages resulting from the use of our services,
                  including but not limited to lost profits, data loss, or
                  business interruptions.
                </p>
                <p>
                  Our maximum liability is limited to the amount paid by the
                  client for the services provided during the twelve (12) months
                  preceding the incident that gives rise to the claim.
                </p>
              </div>
            </section>

            {/* Section 8: Termination */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                8. Termination
              </h2>
              <p className="text-gray-300">
                Either party may terminate the agreement by providing written
                notice. Intellectif reserves the right to terminate services
                immediately if the client breaches any of these terms. In the
                event of termination, the client will be invoiced for any work
                completed up to the termination date.
              </p>
            </section>

            {/* Section 9: Governing Law */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                9. Governing Law
              </h2>
              <p className="text-gray-300">
                These Terms and Conditions shall be governed by and construed in
                accordance with the laws of the United States. Any disputes
                arising from this agreement will be resolved in the courts
                located in Miami, FL.
              </p>
            </section>

            {/* Section 10: Amendments */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                10. Amendments
              </h2>
              <p className="text-gray-300">
                Intellectif reserves the right to modify these Terms and
                Conditions at any time. Clients will be notified of any
                significant changes that may impact their use of our services.
                Continued use of our services following such changes constitutes
                acceptance of the revised terms.
              </p>
            </section>

            {/* Section 11: Contact */}
            <section>
              <h2 className="text-2xl font-bold text-[#6bdcc0] mb-4 border-b border-[#6bdcc0]/20 pb-2">
                11. Contact Us
              </h2>
              <p className="text-gray-300">
                If you have any questions about these Terms and Conditions,
                please contact us at{" "}
                <a
                  href="mailto:contact@intellectif.com"
                  className="text-[#6bdcc0] hover:text-[#22d3ee] transition-colors duration-300 underline"
                >
                  contact@intellectif.com
                </a>
                .
              </p>
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

export default TermsAndConditionsPage;
