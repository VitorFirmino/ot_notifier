import { useState, type MouseEvent } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

const getPreferredTheme = (): Theme => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
};

interface UseThemeToggleResult {
  theme: Theme;
  toggleTheme: (event?: MouseEvent<HTMLElement>) => void;
}

export const useThemeToggle = (): UseThemeToggleResult => {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);

  const toggleTheme = (event?: MouseEvent<HTMLElement>): void => {
    const next: Theme = theme === "light" ? "dark" : "light";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || prefersReducedMotion || !event) {
      applyTheme(next);
      setTheme(next);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => {
      applyTheme(next);
      setTheme(next);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
      );
    });
  };

  return { theme, toggleTheme };
};
