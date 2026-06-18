import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "#eef3ea",
        ink: "#182026",
        moss: "#2f6b56",
        leaf: "#8fb95d",
        clay: "#d65d3f",
        oat: "#dfe8d4",
      },
      boxShadow: {
        node: "0 20px 46px rgba(24, 32, 38, 0.16)",
        active: "0 28px 70px rgba(47, 107, 86, 0.28)",
      },
    },
  },
  plugins: [],
} satisfies Config;
