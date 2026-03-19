import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--ui-border))",
        input: "hsl(var(--ui-input))",
        ring: "hsl(var(--ui-ring))",
        background: "var(--background)",
        foreground: "var(--ink)",
        primary: {
          DEFAULT: "hsl(var(--ui-primary))",
          foreground: "hsl(var(--ui-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--ui-secondary))",
          foreground: "hsl(var(--ui-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--ui-destructive))",
          foreground: "hsl(var(--ui-destructive-foreground))",
        },
        muted: "var(--muted)",
        "muted-foreground": "var(--muted)",
        accent: "var(--accent)",
        "accent-foreground": "var(--surface)",
        popover: {
          DEFAULT: "hsl(var(--ui-popover))",
          foreground: "hsl(var(--ui-popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--ui-card))",
          foreground: "hsl(var(--ui-card-foreground))",
        },
        ink: "var(--ink)",
        "accent-strong": "var(--accent-strong)",
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        stroke: "var(--stroke)",
        brand: {
          muted: "var(--muted)",
          accent: "var(--accent)",
          "accent-strong": "var(--accent-strong)",
          surface: "var(--surface)",
          "surface-soft": "var(--surface-soft)",
          stroke: "var(--stroke)",
          background: "var(--background)",
        },
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-editorial)", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
