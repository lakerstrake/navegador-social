"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ShieldCheck, X, ArrowRight } from "lucide-react";
import { classifyUrl, type SafeUrl } from "@/lib/safeRedirect";

interface BridgeRequest {
  primary: SafeUrl;
  extras: SafeUrl[];
}

// Singleton suscripción para que cualquier parte de la app llame `openSafe(...)`
type Listener = (req: BridgeRequest | null) => void;
const listeners = new Set<Listener>();

export function openSafe(url: string, ...additional: string[]): boolean {
  const primary = classifyUrl(url);
  if (!primary) {
    if (typeof window !== "undefined") {
      console.warn("[safeRedirect] URL bloqueada (dominio no confiable):", url);
    }
    return false;
  }
  const extras = additional
    .map(classifyUrl)
    .filter((u): u is SafeUrl => u !== null);
  const req: BridgeRequest = { primary, extras };
  listeners.forEach(l => l(req));
  return true;
}

function notifyClose() {
  listeners.forEach(l => l(null));
}

export function ExternalLinkBridge() {
  const [req, setReq] = useState<BridgeRequest | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const listener: Listener = (r) => setReq(r);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const close = useCallback(() => { setReq(null); notifyClose(); }, []);

  const confirm = useCallback(() => {
    if (!req) return;
    window.open(req.primary.raw, "_blank", "noopener,noreferrer");
    for (const extra of req.extras) {
      window.open(extra.raw, "_blank", "noopener,noreferrer");
    }
    close();
  }, [req, close]);

  // Cierre con Escape
  useEffect(() => {
    if (!req) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "Enter")  confirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req, close, confirm]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {req && (
        <motion.div
          key="bridge-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={close}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmación de redirección externa"
        >
          <motion.div
            key="bridge-panel"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 8,  scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/25 overflow-hidden"
          >
            <div className="px-5 pt-5 pb-3 flex items-start gap-3 border-b border-slate-100">
              <span className="size-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5 text-indigo-700" strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-extrabold text-slate-900 leading-tight tracking-tight">
                  Vas a salir del Navegador Social
                </h2>
                <p className="text-[12px] text-slate-600 leading-snug mt-1 font-medium">
                  Te dirigimos a un <strong className="font-bold">sitio oficial del Estado colombiano</strong>. Verifica el dominio antes de continuar.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Cancelar"
                className="size-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>

            <div className="px-5 py-3 space-y-2">
              <UrlRow url={req.primary} />
              {req.extras.map(u => <UrlRow key={u.raw} url={u} />)}
            </div>

            <div className="px-5 pt-1 pb-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirm}
                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-bold text-[14px] tracking-tight shadow-md shadow-indigo-700/25 hover:from-indigo-500 hover:to-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-center"
              >
                <span>Continuar al sitio oficial</span>
                <ArrowRight className="size-4 shrink-0" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 text-slate-700 font-semibold text-[13px] hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <p className="text-center text-[10.5px] text-slate-500 mt-1 font-medium leading-snug">
                Al continuar abandonas el Navegador Social. El Estado no se hace responsable del contenido externo.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function UrlRow({ url }: { url: SafeUrl }) {
  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
      <ExternalLink className="size-3.5 text-indigo-600 shrink-0" strokeWidth={2.25} />
      <span className="flex-1 min-w-0 truncate text-[12px] font-mono font-semibold text-slate-800">
        {url.pretty}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
        Oficial
      </span>
    </div>
  );
}
