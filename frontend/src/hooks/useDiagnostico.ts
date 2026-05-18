"use client";

import { useEffect, useRef, useState } from "react";
import type { TriajeResult } from "@/lib/triajeClient";

type Screen = "triaje" | "mapa" | "consultas";

interface Persisted {
  v: 1;
  result: TriajeResult | null;
  screen: Screen;
}

const STORAGE_KEY = "navegador-social:diagnostico:v1";

function read(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Persisted;
    if (data?.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function useDiagnostico() {
  const [result, setResult] = useState<TriajeResult | null>(null);
  const [screen, setScreen] = useState<Screen>("triaje");
  const [hydrated, setHydrated] = useState(false);
  const skipNextWrite = useRef(true);

  // Hidratar desde localStorage (post-mount para evitar mismatch SSR)
  useEffect(() => {
    const data = read();
    if (data) {
      setResult(data.result);
      // Si había un diagnóstico previo, volvemos al mapa para no perder contexto
      setScreen(data.result ? data.screen : "triaje");
    }
    setHydrated(true);
  }, []);

  // Persistir cambios
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextWrite.current) { skipNextWrite.current = false; return; }
    if (typeof window === "undefined") return;
    try {
      const payload: Persisted = { v: 1, result, screen };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota / disabled storage */
    }
  }, [result, screen, hydrated]);

  function clear() {
    setResult(null);
    setScreen("triaje");
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    }
  }

  return { result, setResult, screen, setScreen, hydrated, clear };
}
