"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Accessibility, Contrast, Type, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibility, type FontScale } from "@/hooks/useAccessibility";

const SCALE_OPTIONS: { v: FontScale; label: string; sub: string }[] = [
  { v: 1, label: "A",   sub: "Normal" },
  { v: 2, label: "A+",  sub: "Grande" },
  { v: 3, label: "A++", sub: "Muy grande" },
];

export function AccessibilityWidget() {
  const a11y = useAccessibility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown",   onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown",   onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Opciones de accesibilidad"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "min-h-[36px] min-w-[36px] sm:min-h-[32px] sm:min-w-[32px] rounded-lg flex items-center justify-center transition-colors shrink-0",
          open
            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
            : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
        )}
      >
        <Accessibility className="size-4" strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: -4,  scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute right-0 top-full mt-2 w-72 origin-top-right bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden z-40"
          >
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Accesibilidad</p>
              <p className="text-[12px] text-slate-600 leading-snug mt-0.5 font-medium">
                Ajusta la vista a tus necesidades
              </p>
            </div>

            {/* Alto contraste */}
            <div className="px-4 py-3">
              <button
                onClick={a11y.toggleContrast}
                role="menuitemcheckbox"
                aria-checked={a11y.highContrast}
                className="w-full min-h-[44px] flex items-center gap-3 text-left rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className={cn(
                  "size-9 rounded-xl flex items-center justify-center shrink-0",
                  a11y.highContrast ? "bg-slate-900 text-yellow-300" : "bg-slate-100 text-slate-700"
                )}>
                  <Contrast className="size-4" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 leading-tight">Alto contraste</p>
                  <p className="text-[11.5px] text-slate-600 font-medium leading-snug mt-0.5">Amarillo sobre negro · WCAG AAA</p>
                </div>
                <span className={cn(
                  "relative h-6 w-10 rounded-full transition-colors shrink-0",
                  a11y.highContrast ? "bg-indigo-600" : "bg-slate-200"
                )}>
                  <span className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    a11y.highContrast ? "translate-x-[18px]" : "translate-x-0.5"
                  )} />
                </span>
              </button>
            </div>

            <div className="border-t border-slate-100" />

            {/* Tamaño de fuente */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2 px-1">
                <Type className="size-3.5 text-slate-500" strokeWidth={2.25} />
                <p className="text-[11.5px] font-bold uppercase tracking-wide text-slate-500">Tamaño de letra</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {SCALE_OPTIONS.map(opt => {
                  const active = a11y.fontScale === opt.v;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => a11y.setFontScale(opt.v)}
                      role="menuitemradio"
                      aria-checked={active}
                      className={cn(
                        "min-h-[52px] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all",
                        active
                          ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600/10"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                      )}
                    >
                      <span className={cn(
                        "font-bold leading-none",
                        opt.v === 1 ? "text-[13px]" : opt.v === 2 ? "text-[16px]" : "text-[19px]",
                        active ? "text-indigo-900" : "text-slate-800"
                      )}>{opt.label}</span>
                      <span className={cn(
                        "text-[9.5px] font-medium",
                        active ? "text-indigo-700" : "text-slate-500"
                      )}>{opt.sub}</span>
                      {active && <Check className="size-2.5 text-indigo-600 absolute" style={{ visibility: "hidden" }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {(a11y.highContrast || a11y.fontScale !== 1) && (
              <>
                <div className="border-t border-slate-100" />
                <div className="px-4 py-2.5">
                  <button
                    onClick={a11y.reset}
                    className="w-full min-h-[36px] flex items-center justify-center gap-1.5 rounded-xl text-[12px] text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold transition-colors"
                  >
                    <RotateCcw className="size-3.5" strokeWidth={2} />
                    Restablecer
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
