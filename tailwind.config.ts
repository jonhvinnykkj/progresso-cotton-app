import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /* ===========================
         COTTON APP - iOS Style Design System
         =========================== */

      borderRadius: {
        "3xl": "1.5rem",    /* 24px - iOS large cards */
        "2xl": "1.25rem",   /* 20px - iOS cards */
        xl: "1rem",         /* 16px - iOS buttons/inputs */
        lg: "0.875rem",     /* 14px - iOS medium */
        md: "0.625rem",     /* 10px - iOS small */
        sm: "0.5rem",       /* 8px - iOS tiny */
        xs: "0.375rem",     /* 6px */
      },

      colors: {
        /* Core */
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",

        /* Surfaces */
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          elevated: "hsl(var(--surface-elevated) / <alpha-value>)",
          hover: "hsl(var(--surface-hover) / <alpha-value>)",
        },

        /* Borders */
        border: {
          DEFAULT: "hsl(var(--border) / <alpha-value>)",
          subtle: "hsl(var(--border-subtle) / <alpha-value>)",
          strong: "hsl(var(--border-strong) / <alpha-value>)",
        },

        /* Card */
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },

        /* Popover */
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },

        /* Primary - Dark Green */
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          muted: "hsl(var(--primary-muted) / <alpha-value>)",
        },

        /* Secondary */
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },

        /* Accent - Dark Gold */
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },

        /* Muted */
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },

        /* Destructive */
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },

        /* Input & Ring */
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",

        /* Sidebar */
        sidebar: {
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
        },

        /* Dark Colors */
        neon: {
          green: "hsl(var(--neon-green) / <alpha-value>)",
          yellow: "hsl(var(--neon-yellow) / <alpha-value>)",
          cyan: "hsl(var(--neon-cyan) / <alpha-value>)",
          orange: "hsl(var(--neon-orange) / <alpha-value>)",
          pink: "hsl(var(--neon-pink) / <alpha-value>)",
          purple: "hsl(var(--neon-purple) / <alpha-value>)",
        },

        /* Charts */
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },

        /* Bale Status Colors */
        bale: {
          campo: "hsl(var(--bale-campo) / <alpha-value>)",
          patio: "hsl(var(--bale-patio) / <alpha-value>)",
          beneficiado: "hsl(var(--bale-beneficiado) / <alpha-value>)",
        },

        /* Status (legacy compatibility) */
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        // Legacy compatibility
        serif: ["var(--font-display)"],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.75rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        "5xl": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "6xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },

      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },

      boxShadow: {
        /* iOS-style subtle shadows */
        "ios-sm": "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)",
        "ios": "0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)",
        "ios-md": "0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)",
        "ios-lg": "0 8px 24px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.04)",
        "ios-xl": "0 16px 48px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)",
        /* Subtle glow effects */
        "glow-sm": "0 0 8px rgb(54 124 43 / 0.15)",
        "glow": "0 0 12px rgb(54 124 43 / 0.2)",
        "glow-lg": "0 0 20px rgb(54 124 43 / 0.25)",
        "glow-xl": "0 0 30px rgb(54 124 43 / 0.3)",
        "glow-accent": "0 0 12px rgb(212 168 0 / 0.2)",
        "glow-cyan": "0 0 12px rgb(70 180 150 / 0.2)",
        "glow-orange": "0 0 12px rgb(230 160 30 / 0.2)",
        "inner-glow": "inset 0 0 12px rgb(54 124 43 / 0.05)",
        /* Card shadow */
        "card": "0 2px 8px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 8px 24px rgba(0, 0, 0, 0.08)",
      },

      backdropBlur: {
        xs: "2px",
      },

      keyframes: {
        /* iOS-style spring animations */
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "ios-spring": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "70%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "ios-bounce": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },

      animation: {
        /* iOS-style timing - smooth and natural */
        "accordion-down": "accordion-down 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "accordion-up": "accordion-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.2s ease-out forwards",
        "fade-in-up": "fade-in-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "fade-in-down": "fade-in-down 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "slide-in-right": "slide-in-right 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "slide-in-left": "slide-in-left 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "scale-in": "scale-in 0.2s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "ios-spring": "ios-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "ios-bounce": "ios-bounce 0.15s ease-in-out",
        "shimmer": "shimmer 2s infinite",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
        "spin-slow": "spin-slow 10s linear infinite",
        "gradient": "gradient-shift 4s ease infinite",
      },

      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
      },

      transitionTimingFunction: {
        /* iOS spring curve */
        "ios": "cubic-bezier(0.32, 0.72, 0, 1)",
        "ios-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
