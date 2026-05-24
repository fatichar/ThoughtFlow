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
        canvas: "#f4f1e8",
        ink: "#232522",
        moss: "#536b4f",
        leaf: "#7ea05a",
        clay: "#b15f43",
        oat: "#e6ddca",
      },
      boxShadow: {
        node: "0 20px 50px rgba(44, 47, 37, 0.18)",
        active: "0 28px 70px rgba(83, 107, 79, 0.32)",
      },
    },
  },
  plugins: [],
} satisfies Config;
