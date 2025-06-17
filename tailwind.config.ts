import type { Config } from "tailwindcss";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      dropShadow: {
        "neon-teal": "0 0 8px rgba(107, 220, 192, 0.5)",
        "neon-teal-lg": "0 0 12px rgba(107, 220, 192, 0.8)",
      },
    },
  },
} satisfies Config;
