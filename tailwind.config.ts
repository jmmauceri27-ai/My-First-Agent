import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-oswald)", "system-ui", "sans-serif"],
      },
      colors: {
        gridiron: {
          50: "#f0fbf4",
          100: "#dcf5e4",
          400: "#3ddc7e",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          900: "#0a2e17",
        },
        ink: {
          950: "#08090b",
          900: "#0d0f12",
          850: "#121418",
          800: "#181b20",
          700: "#22262d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
