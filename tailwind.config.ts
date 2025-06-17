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
      colors: {
        "midnight-navy": "#051028",
        "brand-teal": "#6bdcc0",
        "electric-blue": "#0ea5e9",
        "neon-cyan": "#22d3ee",
        "coral-pink": "#f472b6",
        "lime-green": "#84cc16",
        "slate-blue": "#1e293b",
        "cool-gray": "#64748b",
        "light-blue-gray": "#f1f5f9",
      },
      dropShadow: {
        "neon-teal": "0 0 8px rgba(107, 220, 192, 0.5)",
        "neon-teal-lg": "0 0 12px rgba(107, 220, 192, 0.8)",
      },
    },
  },
} satisfies Config;
