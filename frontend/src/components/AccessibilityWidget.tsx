"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Contrast, Type, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibility, type FontScale } from "@/hooks/useAccessibility";

const SCALE_OPTIONS: { v: FontScale; label: string; sub: string }[] = [
  { v: 1, label: "A",   sub: "Normal" },
  { v: 2, label: "A+",  sub: "Grande" },
  { v: 3, label: "A++", sub: "Muy grande" },
];

export function AccessibilityWidget() {
  const a11y = useAccessibility();
  const [open, setOpen]     = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasActiveSetting = a11y.highContrast || a11y.fontScale !== 1;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  const panel = (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="a11y-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-[2px] cursor-default"
            aria-label="Cerrar menú de accesibilidad"
          />

          <motion.div
            key="a11y-panel"
            role="menu"
            aria-label="Ajustes de accesibilidad"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: -4,  scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed z-[70] right-3 sm:right-4 top-[60px] sm:top-[58px] w-[calc(100vw-1.5rem)] sm:w-[320px] max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/15 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-indigo-50/60 to-slate-50/40">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                  <Eye className="size-3.5 text-white" strokeWidth={2.25} />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-slate-900 leading-tight tracking-tight">Accesibilidad visual</p>
                  <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5">Personaliza vista y contraste</p>
                </div>
              </div>
            </div>

            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={a11y.toggleContrast}
                role="menuitemcheckbox"
                aria-checked={a11y.highContrast}
                className={cn(
                  "w-full min-h-[56px] flex items-center gap-3 text-left rounded-xl px-3 py-2.5 transition-colors border-2 cursor-pointer",
                  a11y.highContrast
                    ? "bg-indigo-50/60 border-indigo-600"
                    : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                )}
              >
                <span className={cn(
                  "size-10 rounded-xl flex items-center justify-center shrink-0 pointer-events-none",
                  a11y.highContrast ? "bg-slate-900 text-yellow-300" : "bg-slate-100 text-slate-700"
                )}>
                  <Contrast className="size-4" strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0 pointer-events-none">
                  <p className={cn("text-[13px] font-bold leading-tight tracking-tight", a11y.highContrast ? "text-indigo-900" : "text-slate-900")}>
                    Alto contraste
                  </p>
                  <p className={cn("text-[11px] leading-snug mt-0.5 font-medium", a11y.highContrast ? "text-indigo-700" : "text-slate-600")}>
                    Amarillo sobre negro · WCAG AAA
                  </p>
                </div>
                <span className={cn(
                  "relative h-6 w-11 rounded-full transition-colors shrink-0 border-2 pointer-events-none",
                  a11y.highContrast ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-200"
                )}>
                  <span className={cn(
                    "absolute top-0 size-4 rounded-full bg-white shadow transition-transform",
                    a11y.highContrast ? "translate-x-[18px]" : "translate-x-0.5"
                  )} />
                </span>
              </button>
            </div>

            <div className="px-3 pt-2 pb-3">
              <div className="flex items-center gap-1.5 px-2 mb-1.5">
                <Type className="size-3.5 text-slate-500 shrink-0" strokeWidth={2.25} />
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tamaño de letra</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {SCALE_OPTIONS.map(opt => {
                  const active = a11y.fontScale === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => a11y.setFontScale(opt.v)}
                      role="menuitemradio"
                      aria-checked={active}
                      aria-label={`Letra ${opt.sub.toLowerCase()}`}
                      className={cn(
                        "relative min-h-[60px] rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer",
                        active
                          ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600/10"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                      )}
                    >
                      <span className={cn(
                        "font-extrabold leading-none tracking-tight pointer-events-none",
                        opt.v === 1 ? "text-[14px]" : opt.v === 2 ? "text-[17px]" : "text-[20px]",
                        active ? "text-indigo-900" : "text-slate-800"
                      )}>
                        {opt.label}
                      </span>
                      <span className={cn(
                        "text-[10px] font-semibold pointer-events-none",
                        active ? "text-indigo-700" : "text-slate-500"
                      )}>
                        {opt.sub}
                      </span>
                      {active && (
                        <span className="absolute top-1 right-1 size-4 rounded-full bg-indigo-600 flex items-center justify-center pointer-events-none">
                          <Check className="size-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasActiveSetting && (
              <div className="border-t border-slate-100 px-3 py-2.5 bg-slate-50/40">
                <button
                  type="button"
                  onClick={a11y.reset}
                  className="w-full min-h-[36px] flex items-center justify-center gap-1.5 rounded-lg text-[12px] text-slate-700 hover:text-slate-900 hover:bg-white font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-3.5 pointer-events-none" strokeWidth={2.25} />
                  Restablecer valores por defecto
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Opciones de accesibilidad"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Ajustar contraste y tamaño de letra"
        className={cn(
          "relative shrink-0 min-h-[40px] sm:min-h-[36px] flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 border font-semibold text-[12px] tracking-tight transition-colors cursor-pointer select-none",
          open
            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/25"
            : hasActiveSetting
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        )}
      >
        <Eye className="size-4 shrink-0 pointer-events-none" strokeWidth={2} aria-hidden="true" />
        <span className="hidden sm:inline pointer-events-none">Accesibilidad</span>
        {hasActiveSetting && !open && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-white pointer-events-none" aria-hidden="true" />
        )}
      </button>

      {mounted && createPortal(panel, document.body)}
    </>
  );
}
