import { type NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Add this images configuration
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
