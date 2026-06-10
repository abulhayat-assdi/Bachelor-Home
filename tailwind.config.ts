import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        surface: "var(--surface)",
        bg: "var(--bg)",
        text: "var(--text)",
        muted: "var(--muted)",
        "border-c": "var(--border)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(20, 20, 60, 0.06)",
        "card-dark": "0 2px 12px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
