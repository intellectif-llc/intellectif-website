"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Lottie from "lottie-react";

export default function NotFound() {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch("/animations/404-not-found.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => setAnimationData(data))
      .catch((error) =>
        console.error("Error loading Lottie animation:", error)
      );
  }, []);

  return (
    <div className="min-h-screen bg-[#051028] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6bdcc0] opacity-5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0ea5e9] opacity-5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="max-w-md mx-auto text-center relative z-10">
        {/* Lottie Animation */}
        <div className="mb-6 flex justify-center items-center h-[280px]">
          {animationData ? (
            <div
              style={{
                filter: "drop-shadow(0 10px 20px rgba(107, 220, 192, 0.3))",
              }}
            >
              <Lottie
                animationData={animationData}
                loop={true}
                autoplay={true}
                style={{
                  width: "280px",
                  height: "280px",
                }}
                className="transition-transform duration-300 hover:scale-105"
              />
            </div>
          ) : (
            <div className="w-[280px] h-[280px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6bdcc0]"></div>
            </div>
          )}
        </div>

        {/* Error Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-300 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <Link
            href="/"
            className="inline-block w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#6bdcc0] to-[#4ade80] text-[#051028] font-semibold rounded-xl hover:from-[#5bc7ab] hover:to-[#3ab575] transition-all duration-300 cursor-pointer transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            🏠 Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-6 py-3 text-[#6bdcc0] border border-[#6bdcc0]/30 rounded-xl font-semibold hover:bg-[#6bdcc0]/10 hover:border-[#6bdcc0]/50 transition-all duration-300 cursor-pointer transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            ⬅️ Go Back
          </button>
        </div>

        {/* Additional Help Text */}
        <div className="mt-8 pt-6 border-t border-[#6bdcc0]/20">
          <p className="text-sm text-gray-400">
            Lost? Try searching from our{" "}
            <Link
              href="/"
              className="text-[#6bdcc0] hover:text-[#5bc7ab] transition-colors duration-300 cursor-pointer underline underline-offset-2"
            >
              homepage
            </Link>{" "}
            or{" "}
            <Link
              href="/solutions"
              className="text-[#6bdcc0] hover:text-[#5bc7ab] transition-colors duration-300 cursor-pointer underline underline-offset-2"
            >
              explore our solutions
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
