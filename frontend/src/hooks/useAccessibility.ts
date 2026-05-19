"use client";

import { useEffect, useState, useCallback } from "react";

export type FontScale = 1 | 2 | 3;

const STORAGE_KEY = "navegador-social:a11y:v1";

interface Persisted {
  highContrast: boolean;
  fontScale: FontScale;
}

function read(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function applyToDom(highContrast: boolean, fontScale: FontScale) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("high-contrast", highContrast);
  html.classList.remove("font-scale-1", "font-scale-2", "font-scale-3");
  html.classList.add(`font-scale-${fontScale}`);
}

export function useAccessibility() {
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale,    setFontScale]    = useState<FontScale>(1);
  const [hydrated,     setHydrated]     = useState(false);

  useEffect(() => {
    const data = read();
    if (data) {
      setHighContrast(Boolean(data.highContrast));
      setFontScale((data.fontScale ?? 1) as FontScale);
      applyToDom(Boolean(data.highContrast), (data.fontScale ?? 1) as FontScale);
    } else {
      applyToDom(false, 1);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyToDom(highContrast, fontScale);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ highContrast, fontScale }));
    } catch { /* ignore */ }
  }, [highContrast, fontScale, hydrated]);

  const toggleContrast = useCallback(() => setHighContrast(v => !v), []);
  const cycleFont      = useCallback(() => setFontScale(s => (s === 3 ? 1 : (s + 1) as FontScale)), []);
  const reset          = useCallback(() => { setHighContrast(false); setFontScale(1); }, []);

  return { highContrast, fontScale, toggleContrast, cycleFont, setFontScale, setHighContrast, reset };
}
