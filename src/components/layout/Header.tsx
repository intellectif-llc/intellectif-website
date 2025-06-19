"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { NAVIGATION_ITEMS } from "@/constants/services";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${
          isScrolled
            ? "bg-[#051028] bg-opacity-95 backdrop-blur-sm shadow-lg"
            : "bg-transparent"
        }
      `}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo.png"
              alt="Intellectif Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
            <span className="text-xl font-bold text-[#6bdcc0]">
              Intellectif
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex items-center space-x-6">
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="
                    group relative text-white font-medium
                    transition-all duration-500 ease-out
                    py-3 px-5 rounded-xl
                    hover:scale-[1.02] transform hover:-translate-y-1
                    overflow-hidden backdrop-blur-sm
                  "
                  style={{
                    background: "rgba(30, 41, 59, 0.3)",
                    border: "1px solid rgba(107, 220, 192, 0.2)",
                    boxShadow: "0 4px 16px rgba(107, 220, 192, 0.1)",
                  }}
                >
                  <span className="relative z-20 transition-all duration-500 group-hover:text-[#051028] font-semibold tracking-wide drop-shadow-sm">
                    {item.label}
                  </span>
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                    }}
                  ></div>

                  {/* Enhanced glow on hover */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out pointer-events-none"
                    style={{
                      boxShadow: `
                        0 0 20px rgba(107, 220, 192, 0.6),
                        0 0 40px rgba(107, 220, 192, 0.3)
                      `,
                    }}
                  ></div>

                  {/* Subtle shimmer effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
                    <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </Link>
              ))}
            </nav>

            {/* Authentication Section */}
            {!loading && (
              <div className="flex items-center space-x-4">
                {user ? (
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/dashboard"
                      className="text-white hover:text-[#6bdcc0] transition-colors duration-300"
                    >
                      Dashboard
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signOut()}
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link href="/auth/signin">
                      <Button variant="ghost" size="sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button variant="primary" size="sm">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden relative w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 group"
            aria-label="Toggle menu"
          >
            <div className="space-y-1.5">
              <span
                className={`block w-6 h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out ${
                  isMenuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              ></span>
              <span
                className={`block w-6 h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              ></span>
              <span
                className={`block w-6 h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out ${
                  isMenuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              ></span>
            </div>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMenuOpen
              ? "max-h-[600px] opacity-100 mt-6"
              : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <nav className="bg-[#1e293b] bg-opacity-95 backdrop-blur-sm rounded-2xl p-6 border border-[#6bdcc0]/20 shadow-xl">
            <ul className="space-y-4">
              {NAVIGATION_ITEMS.map((item, index) => (
                <li
                  key={item.label}
                  className={`transform transition-all duration-300 ease-out ${
                    isMenuOpen
                      ? "translate-x-0 opacity-100"
                      : "translate-x-4 opacity-0"
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <Link
                    href={item.href}
                    className="
                      group block w-full text-left px-5 py-4 rounded-xl
                      text-white font-medium border border-transparent
                      transition-all duration-500 ease-out
                      hover:scale-[1.02] transform hover:-translate-y-1
                      relative overflow-hidden backdrop-blur-sm
                    "
                    style={{
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(107, 220, 192, 0.3)",
                      boxShadow: "0 4px 16px rgba(107, 220, 192, 0.2)",
                    }}
                  >
                    <span className="relative z-20 transition-all duration-500 group-hover:text-[#051028] font-semibold tracking-wide drop-shadow-sm">
                      {item.label}
                    </span>
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, #6bdcc0 0%, #22d3ee 50%, #0ea5e9 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                      }}
                    ></div>

                    {/* Enhanced glow on hover */}
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out pointer-events-none"
                      style={{
                        boxShadow: `
                          0 0 20px rgba(107, 220, 192, 0.6),
                          0 0 40px rgba(107, 220, 192, 0.3)
                        `,
                      }}
                    ></div>

                    {/* Subtle shimmer effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
                      <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mobile Authentication Section */}
            {!loading && (
              <div className="mt-6 pt-6 border-t border-[#6bdcc0]/20">
                {user ? (
                  <div className="space-y-3">
                    <Link
                      href="/dashboard"
                      className="block w-full text-center py-3 px-4 rounded-xl text-white font-medium bg-[#6bdcc0]/10 border border-[#6bdcc0]/30 hover:bg-[#6bdcc0]/20 transition-all duration-300"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="block w-full text-center py-3 px-4 rounded-xl text-white font-medium bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all duration-300"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      href="/auth/signin"
                      className="block w-full text-center py-3 px-4 rounded-xl text-white font-medium bg-[#6bdcc0]/10 border border-[#6bdcc0]/30 hover:bg-[#6bdcc0]/20 transition-all duration-300"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="block w-full text-center py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-[#6bdcc0] to-[#22d3ee] hover:from-[#22d3ee] hover:to-[#0ea5e9] transition-all duration-300"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
