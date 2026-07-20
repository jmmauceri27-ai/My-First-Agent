import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gridiron: {
          50: "#f0fbf4",
          100: "#dcf5e4",
          500: "#1c7a3e",
          600: "#166030",
          700: "#124d27",
          900: "#0a2e17",
        },
      },
    },
  },
  plugins: [],
};

export default config;
