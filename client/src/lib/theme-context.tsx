import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem("cotton_theme");
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}

// Apply theme to DOM synchronously
function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;

  // Disable transitions
  root.classList.add("no-transitions");

  // Apply theme
  if (theme === "light") {
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }

  // Save to localStorage
  localStorage.setItem("cotton_theme", theme);

  // Force reflow
  void root.offsetHeight;

  // Re-enable transitions after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("no-transitions");
    });
  });
}

// Apply initial theme immediately (before React hydration)
if (typeof window !== "undefined") {
  const initialTheme = getInitialTheme();
  const root = document.documentElement;
  if (initialTheme === "light") {
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const isFirstRender = useRef(true);

  // Skip effect on first render since we applied theme above
  if (isFirstRender.current) {
    isFirstRender.current = false;
  }

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const newTheme = prev === "dark" ? "light" : "dark";
      // Apply to DOM BEFORE React re-renders
      applyThemeToDOM(newTheme);
      return newTheme;
    });
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    applyThemeToDOM(newTheme);
    setThemeState(newTheme);
  }, []);

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme
  }), [theme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
