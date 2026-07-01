import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Moon, SunMedium } from "lucide-react";
import { Badge, Button } from "./primitives.js";

const h = React.createElement;
const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme(storageKey) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function ThemeProvider({ children, storageKey = "mytgo-theme" }) {
  const [themeMode, setThemeMode] = useState(() => {
    const stored = readStoredTheme(storageKey);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (themeMode !== "system" || typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(media.matches ? "dark" : "light");

    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [themeMode]);

  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.theme = resolvedTheme;

    try {
      window.localStorage.setItem(storageKey, themeMode);
    } catch {
      // localStorage unavailable; keep the resolved theme in memory only.
    }
  }, [resolvedTheme, storageKey, themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      setThemeMode,
      setLight: () => setThemeMode("light"),
      setDark: () => setThemeMode("dark"),
      setSystem: () => setThemeMode("system"),
      toggleTheme: () =>
        setThemeMode((current) => {
          if (current === "system") {
            return getSystemTheme() === "dark" ? "light" : "dark";
          }
          return current === "dark" ? "light" : "dark";
        }),
    }),
    [resolvedTheme, themeMode],
  );

  return h(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeToggle({ className }) {
  const { themeMode, resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Moon : SunMedium;
  const label = isDark ? "Koyu" : "Açık";

  return h(
    Button,
    {
      type: "button",
      variant: "ghost",
      size: "sm",
      className: `gap-2 ${className ?? ""}`.trim(),
      onClick: toggleTheme,
      "aria-label": `Tema değiştir, mevcut tema ${label}`,
    },
    h(Icon, { size: 16, className: "shrink-0" }),
    h(
      "span",
      { className: "flex items-center gap-2" },
      h("span", null, label),
      themeMode === "system"
        ? h(
            Badge,
            {
              variant: "outline",
              size: "xs",
              className: "border-white/20 bg-white/10 text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
            },
            "Sistem",
          )
        : null,
    ),
  );
}

