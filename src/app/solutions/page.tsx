"use client";

import React from "react";
import Button from "@/components/ui/Button";

const SolutionsPage: React.FC = () => {
  const features = [
    {
      category: "💬 Inbox & Contacts",
      items: [
        "Team & Custom Inboxes",
        "Mobile App",
        "AI Prompts & AI Assist",
        "AI Summary",
      ],
    },
    {
      category: "📢 Broadcasts",
      items: ["Broadcast", "Broadcast Analytics"],
    },
    {
      category: "✨ Workflows & Automation",
      items: ["Workflow", "AI Agent"],
    },
    {
      category: "💻 Integrations",
      items: [
        "Hubspot (Currently in beta)",
        "Salesforce (Currently in beta)",
        "Meta & TikTok Ads",
        "Meta Product Catalog",
        "Growth Widgets",
        "Developer API",
        "Zapier & Make",
        "Webhook Events",
        "HTTP Requests Step",
      ],
    },
    {
      category: "☎️ Support",
      items: ["24-Hour Chat Support", "Onboarding Program"],
    },
    {
      category: "📈 Reports",
      items: ["Real Time Dashboard", "Basic Reports", "Advanced Reports"],
    },
    {
      category: "🔒 Security",
      items: [
        "Data Export",
        "Two-Factor Authentication (2FA)",
        "Mask Phone Number & Email address",
        "Single Sign-On (SSO)",
      ],
    },
    {
      category: "🏢 Workspaces & Users",
      items: ["Multiple Workspaces"],
    },
  ];

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
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
            Our <span className="gradient-text">Solutions</span>
          </h1>
          <p className="text-xl text-[#64748b] max-w-3xl mx-auto">
            Discover powerful tools and integrations to transform your business
            communication and automation.
          </p>
        </div>

        {/* Respond.io Product Card */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 border border-[#6bdcc0]/20 shadow-2xl">
            {/* Card Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#051028]">R</span>
                </div>
                <h2 className="text-3xl font-bold text-white">Respond.io</h2>
              </div>
              <p className="text-lg text-gray-300 mb-6">
                Advanced customer conversation management platform with
                AI-powered automation
              </p>

              {/* Pricing */}
              <div className="inline-flex items-center gap-4 bg-[#051028] rounded-2xl px-6 py-4 border border-[#6bdcc0]/30">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#6bdcc0]">$50</div>
                  <div className="text-sm text-gray-400">USD/month</div>
                </div>
                <div className="w-px h-8 bg-[#6bdcc0]/30"></div>
                <div className="text-left">
                  <div className="text-white font-semibold">1 User</div>
                  <div className="text-gray-400 text-sm">
                    200 Monthly Active Contacts
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {features.map((section, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#6bdcc0] border-b border-[#6bdcc0]/20 pb-2">
                    {section.category}
                  </h3>
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="flex items-start gap-2 text-gray-300 text-sm"
                      >
                        <div className="w-1.5 h-1.5 bg-[#6bdcc0] rounded-full mt-2 flex-shrink-0"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Call to Action */}
            <div className="text-center pt-6 border-t border-[#6bdcc0]/20">
              <p className="text-gray-300 mb-6">
                Get advanced customer communication features at an unbeatable
                price. Perfect for growing businesses looking to streamline
                their customer interactions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  variant="primary"
                  size="lg"
                  href="https://get.respond.io/intellectif"
                  className="w-full sm:w-auto"
                >
                  Get Respond.io for $50/month
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                * Special pricing available through partnership
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-12 text-center">
            <div className="bg-[#1e293b] bg-opacity-40 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/10">
              <h3 className="text-xl font-semibold text-white mb-4">
                Why Choose Respond.io Through Intellectif?
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl mb-2">💰</div>
                  <h4 className="font-semibold text-[#6bdcc0] mb-2">
                    Best Price
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Get premium features at a fraction of the regular cost
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">🚀</div>
                  <h4 className="font-semibold text-[#6bdcc0] mb-2">
                    Expert Setup
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Professional onboarding and integration assistance
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="font-semibold text-[#6bdcc0] mb-2">
                    Ongoing Support
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Dedicated support from our technical team
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolutionsPage;
