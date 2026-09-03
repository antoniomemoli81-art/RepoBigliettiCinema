import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tesla: {
          blue: "#3e6ae1",
          "blue-hover": "#3457b2",
          white: "#ffffff",
          "off-white": "#f5f5f7",
          parchment: "#e5e3df",
          border: "#e0e0e0",
          "border-dark": "#cccccc",
          gray: "#8e8e93",
          steel: "#5c5e62",
          charcoal: "#393c41",
          onyx: "#171a20",
          carbon: "#000000",
        },
      },
      borderRadius: {
        tesla: "4px",
        "tesla-card": "8px",
      },
      boxShadow: {
        tesla: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        "tesla-hover": "0 4px 16px rgba(0,0,0,0.06)",
        "tesla-modal": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
