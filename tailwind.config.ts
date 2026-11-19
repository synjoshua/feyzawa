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
        fog: "var(--fog)",
        mist: "var(--mist)",
        paper: "var(--paper)",
        moss: "var(--moss)",
        "moss-deep": "var(--moss-deep)",
        leaf: "var(--leaf)",
        amber: "var(--amber)",
        clay: "var(--clay)",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      boxShadow: {
        panel: "0 18px 50px -28px rgba(20, 26, 22, 0.35)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
