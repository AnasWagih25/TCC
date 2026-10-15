"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  systemTheme.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    systemTheme.removeEventListener("change", onChange);
  };
}

function getTheme() {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "system-dark"
    : "system-light";
}

function setTheme(theme: string) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem("tcc_theme");
    else localStorage.setItem("tcc_theme", theme);
  } catch {
    /* This tab still changes appearance when browser storage is disabled. */
  }
}

export default function ThemeSwitch() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    () => "system-light",
  );
  const isDark = theme.endsWith("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tcc_theme");
      if (saved === "light" || saved === "dark") {
        document.documentElement.dataset.theme = saved;
      }
    } catch {
      /* System colors remain available if browser storage is disabled. */
    }
  }, []);
  return (
    <>
      <label
        className="theme-switch desktop-theme-switch icon-button"
        title="Change appearance"
      >
        <SunMoon size={18} strokeWidth={1.4} />
        <select
          value={theme.startsWith("system") ? "system" : theme}
          aria-label="Color appearance"
          onChange={(event) => setTheme(event.target.value)}
        >
          <option value="system">System appearance</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <button
        type="button"
        className="mobile-theme-toggle"
        role="switch"
        aria-label="Dark mode"
        aria-checked={isDark}
        title={`Switch to ${isDark ? "light" : "dark"} mode`}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <span className="theme-toggle-track" aria-hidden="true">
          <Sun size={12} strokeWidth={1.8} />
          <Moon size={12} strokeWidth={1.8} />
          <span className="theme-toggle-thumb" />
        </span>
      </button>
    </>
  );
}
