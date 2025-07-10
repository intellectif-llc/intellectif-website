"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { useSolutions } from "@/hooks/useSolutions";
import type { Solution, SolutionsApiResponse } from "@/types/solutions";

// Helper function to construct CloudFront URL for logos
const getLogoUrl = (logoKey?: string): string | null => {
  if (!logoKey) return null;
  const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
  if (!cloudFrontUrl) {
    console.warn("NEXT_PUBLIC_CLOUDFRONT_URL environment variable is not set");
    return null;
  }
  return `${cloudFrontUrl}/${logoKey}`;
};

// Helper function to format price display
const formatPrice = (solution: Solution): string => {
  if (solution.price === 0) return "Free";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: solution.currency || "USD",
    minimumFractionDigits: solution.price % 1 === 0 ? 0 : 2,
  });

  return formatter.format(solution.price);
};

// Component for individual solution card
const SolutionCard: React.FC<{ solution: Solution }> = ({ solution }) => {
  const logoUrl = getLogoUrl(solution.logo_url);
  const isThirdParty = solution.solution_type === "third_party";

  return (
    <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-3xl p-8 border border-[#6bdcc0]/20 shadow-2xl">
      {/* Card Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          {/* Logo Container - Different styling for third-party vs owned solutions */}
          {isThirdParty && logoUrl ? (
            // Third-party logo: Display as-is without gradient background for brand compliance
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src={logoUrl}
                alt={`${solution.name} logo`}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  // Fallback to gradient container with first letter if image fails
                  const target = e.target as HTMLImageElement;
                  const container = target.parentElement;
                  if (container) {
                    container.className =
                      "w-12 h-12 bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] rounded-xl flex items-center justify-center";
                    container.innerHTML = `<span class="text-2xl font-bold text-[#051028]">${solution.name.charAt(
                      0
                    )}</span>`;
                  }
                }}
              />
            </div>
          ) : (
            // Own solutions or no logo: Use gradient background with logo or fallback letter
            <div className="w-12 h-12 bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] rounded-xl flex items-center justify-center">
              {logoUrl && !isThirdParty ? (
                <img
                  src={logoUrl}
                  alt={`${solution.name} logo`}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    // Fallback to first letter if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "block";
                  }}
                />
              ) : null}
              <span
                className="text-2xl font-bold text-[#051028]"
                style={{ display: logoUrl && !isThirdParty ? "none" : "block" }}
              >
                {solution.name.charAt(0)}
              </span>
            </div>
          )}
          <h2 className="text-3xl font-bold text-white">{solution.name}</h2>
        </div>

        {solution.tagline && (
          <p className="text-lg text-gray-300 mb-6">{solution.tagline}</p>
        )}

        {/* Pricing */}
        <div className="inline-flex items-center gap-4 bg-[#051028] rounded-2xl px-6 py-4 border border-[#6bdcc0]/30">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#6bdcc0]">
              {formatPrice(solution)}
            </div>
            {solution.price_period && (
              <div className="text-sm text-gray-400">
                {solution.price_period}
              </div>
            )}
          </div>
          {solution.price_description && (
            <>
              <div className="w-px h-8 bg-[#6bdcc0]/30"></div>
              <div className="text-left">
                <div className="text-white font-semibold text-sm">
                  {solution.price_description}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Features Grid */}
      {solution.features.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {solution.features.map((featureGroup, index) => (
            <div key={index} className="space-y-3">
              <h3 className="text-lg font-semibold text-[#6bdcc0] border-b border-[#6bdcc0]/20 pb-2">
                {featureGroup.category}
              </h3>
              <ul className="space-y-2">
                {featureGroup.items.map((item, itemIndex) => (
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
      )}

      {/* Call to Action */}
      <div className="text-center pt-6 border-t border-[#6bdcc0]/20">
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {solution.call_to_action_url && (
            <Button
              variant="primary"
              size="lg"
              href={solution.call_to_action_url}
              external={solution.call_to_action_url.startsWith("http")}
              className="w-full sm:w-auto"
            >
              {solution.call_to_action_text || `Get ${solution.name}`}
            </Button>
          )}
        </div>

        {solution.special_pricing_note && (
          <p className="text-xs text-gray-500 mt-4">
            {solution.special_pricing_note}
          </p>
        )}
      </div>
    </div>
  );
};

// Component for selling points section
const SellingPointsSection: React.FC<{ solutions: Solution[] }> = ({
  solutions,
}) => {
  // Aggregate all unique selling points from all solutions
  const allSellingPoints = solutions.flatMap((solution) =>
    solution.selling_points.map((point) => ({
      ...point,
      solutionName: solution.name,
    }))
  );

  if (allSellingPoints.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="bg-[#1e293b] bg-opacity-40 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/10">
        <h3 className="text-xl font-semibold text-white mb-4 text-center">
          Why Choose Our Solutions?
        </h3>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          {allSellingPoints.slice(0, 3).map((point, index) => (
            <div key={`${point.solution_id}-${point.id}`}>
              <div className="text-3xl mb-2">{point.emoji}</div>
              <h4 className="font-semibold text-[#6bdcc0] mb-2">
                {point.title}
              </h4>
              <p className="text-gray-300 text-sm">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Loading component
const LoadingState: React.FC = () => (
  <div className="min-h-screen bg-[#051028] pt-20">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6bdcc0] opacity-5 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0ea5e9] opacity-5 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>
    </div>

    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
          Our <span className="gradient-text">Solutions</span>
        </h1>
        <p className="text-xl text-[#64748b] max-w-3xl mx-auto">
          Loading our powerful solutions...
        </p>
      </div>

      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0]"></div>
      </div>
    </div>
  </div>
);

// Error component
const ErrorState: React.FC<{ error: string }> = ({ error }) => (
  <div className="min-h-screen bg-[#051028] pt-20">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6bdcc0] opacity-5 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0ea5e9] opacity-5 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>
    </div>

    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
          Our <span className="gradient-text">Solutions</span>
        </h1>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <p className="text-red-400 text-lg mb-4">
              We're having trouble loading our solutions right now.
            </p>
            <p className="text-gray-400 text-sm">Error: {error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Empty state component
const EmptyState: React.FC = () => (
  <div className="min-h-screen bg-[#051028] pt-20">
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6bdcc0] opacity-5 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0ea5e9] opacity-5 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>
    </div>

    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
          Our <span className="gradient-text">Solutions</span>
        </h1>
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#1e293b] bg-opacity-60 backdrop-blur-sm rounded-2xl p-12 border border-[#6bdcc0]/20">
            <div className="text-6xl mb-6">🔧</div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Solutions Coming Soon
            </h2>
            <p className="text-gray-300 text-lg mb-6">
              We're currently preparing our suite of powerful solutions to help
              transform your business.
            </p>
            <p className="text-gray-400">
              Check back soon or contact us to learn more about our upcoming
              offerings.
            </p>
            <Button variant="primary" href="/booking" className="mt-6">
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main component
const SolutionsPage: React.FC = () => {
  const { data, isLoading, error } = useSolutions();

  console.log("🎯 Solutions page render:", {
    isLoading,
    error: error?.message,
    solutionsCount: data?.solutions?.length || 0,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error.message} />;
  }

  if (!data || data.solutions.length === 0) {
    return <EmptyState />;
  }

  // TypeScript knows data is SolutionsApiResponse here due to the checks above
  const solutionsData = data as SolutionsApiResponse;

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

        {/* Solutions Grid */}
        <div className="max-w-7xl mx-auto">
          <div
            className={`grid gap-8 ${
              solutionsData.solutions.length === 1
                ? "max-w-4xl mx-auto"
                : "md:grid-cols-2 xl:grid-cols-3"
            }`}
          >
            {solutionsData.solutions.map((solution) => (
              <SolutionCard key={solution.id} solution={solution} />
            ))}
          </div>

          {/* Selling Points Section */}
          <SellingPointsSection solutions={solutionsData.solutions} />
        </div>
      </div>
    </div>
  );
};

export default SolutionsPage;
