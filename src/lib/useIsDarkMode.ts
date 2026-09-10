"use client";

import { useEffect, useState } from "react";

/** Tracks the .dark class on <html> (set by the no-FOUC init script, flipped by ThemeToggle) so chart
 * components can pick the right palette. A MutationObserver -- not a shared context -- because the
 * toggle mutates the DOM class directly rather than going through React state. */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    // Reads a client-only global (the .dark class the no-FOUC script already applied) that can't be
    // known during SSR -- there's no external-system "change" to subscribe to for this first read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(root.classList.contains("dark"));

    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
