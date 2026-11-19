import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        steam: "var(--steam)",
        porcelain: "var(--porcelain)",
        foam: "var(--foam)",
        jade: "var(--jade)",
        matcha: "var(--matcha)",
        leaf: "var(--leaf)",
        chartreuse: "var(--chartreuse)",
        ceramic: "var(--ceramic)",
        fog: "var(--fog)",
        mist: "var(--mist)",
        paper: "var(--paper)",
        moss: "var(--moss)",
        "moss-deep": "var(--moss-deep)",
        amber: "var(--amber)",
        clay: "var(--clay)",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      boxShadow: {
        panel: "0 24px 60px -36px rgba(12, 22, 17, 0.28)",
        soft: "0 10px 30px -20px rgba(31, 107, 74, 0.35)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        tea: "1.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
