"use client";

import { useEffect, useState } from "react";

/** Mirrors whatever the no-FOUC init script (in layout.tsx) already applied to <html> before hydration --
 * this never decides the theme itself, it only reflects and toggles it. */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Reads a client-only global (the .dark class the no-FOUC script already applied) that can't be
    // known during SSR -- this just syncs the button's icon to what's already on the page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing / storage disabled -- the toggle still works for this page load.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg p-2 text-lg leading-none text-slate-500 transition-colors hover:bg-purple-500/10 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
