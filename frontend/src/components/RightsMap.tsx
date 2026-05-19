"use client";

import { motion } from "framer-motion";
import {
  ExternalLink, MessageSquare, ArrowLeft, ShieldAlert, BarChart3,
  Sparkles, ChevronRight, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type TriajeResult, RIESGO_CONFIG } from "@/lib/triajeClient";

const BETOWA_URL = "https://betowa.sena.edu.co/";

function openLink(url: string) {
  const isSena = /sena\.edu\.co/i.test(url);
  window.open(url, "_blank", "noopener,noreferrer");
  if (isSena) window.open(BETOWA_URL, "_blank", "noopener,noreferrer");
}

interface Props {
  result: TriajeResult;
  onReset: () => void;
  onDeepConsult: () => void;
}

// ── Badge de nivel (sin rojo extremo, framing positivo) ─────────────────────
function LevelBadge({ nivel }: { nivel: TriajeResult["nivel_riesgo"] }) {
  const cfg = RIESGO_CONFIG[nivel];
  const bars: Record<string, string[]> = {
    ROJO:     ["bg-indigo-500",  "bg-indigo-500", "bg-indigo-500"],
    AMARILLO: ["bg-emerald-400", "bg-amber-400",  "bg-slate-200"],
    VERDE:    ["bg-emerald-500", "bg-slate-200",  "bg-slate-200"],
  };
  return (
    <div className={cn("flex items-center gap-3.5 rounded-2xl border px-5 py-4", cfg.bg, cfg.border)}>
      <div className="flex gap-1 items-end h-9 shrink-0">
        {bars[nivel].map((c, i) => (
          <div key={i} className={cn("w-2.5 rounded-full", c)} style={{ height: `${(i + 1) * 33}%` }} />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[20px]">{cfg.emoji}</span>
          <span className={cn("text-[14px] font-extrabold uppercase tracking-wide", cfg.text)}>{cfg.label}</span>
        </div>
        <p className={cn("text-[12.5px] leading-relaxed font-medium", cfg.text, "opacity-85")}>{cfg.description}</p>
      </div>
    </div>
  );
}

// ── Roadmap Timeline ─────────────────────────────────────────────────────────
function RoadmapStep({
  numero, icono, titulo, descripcion, accion, url, isLast,
}: {
  numero: number;
  icono: string;
  titulo: string;
  descripcion: string;
  accion: string;
  url?: string;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {/* Rail vertical + nodo */}
      <div className="flex flex-col items-center shrink-0">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.04 * numero, duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
          className="size-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-bold text-[13px] shadow-md shadow-indigo-600/25 ring-4 ring-white z-10"
        >
          {numero}
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.04 * numero + 0.1, duration: 0.4 }}
            style={{ transformOrigin: "top" }}
            className="flex-1 w-[2px] bg-gradient-to-b from-indigo-300 via-indigo-200 to-indigo-100 my-1 min-h-[24px]"
          />
        )}
      </div>

      {/* Card del paso */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.04 * numero + 0.05, duration: 0.32 }}
        className="flex-1 min-w-0 pb-4"
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-2 mb-1.5">
              <span className="text-[18px] shrink-0 leading-none mt-0.5">{icono}</span>
              <h3 className="text-[14.5px] font-bold text-slate-900 leading-tight tracking-tight">{titulo}</h3>
            </div>
            <p className="text-[13px] text-slate-700 leading-relaxed font-normal">{descripcion}</p>
          </div>
          {url && (
            <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/60">
              <button
                onClick={() => openLink(url)}
                className="inline-flex items-center gap-1.5 min-h-[36px] text-[12.5px] font-semibold text-indigo-700 hover:text-indigo-900 transition-colors group"
              >
                <ExternalLink className="size-3.5 shrink-0" strokeWidth={2.25} />
                <span>{accion || "Ver portal oficial"}</span>
                <ChevronRight className="size-3.5 shrink-0 -ml-0.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function RightsMap({ result, onReset, onDeepConsult }: Props) {
  return (
    <div className="flex flex-col min-h-full bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-5">

        {/* ── Header ── */}
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold px-3 py-1 rounded-full mb-3 shadow-sm">
            <Sparkles className="size-3 text-indigo-600" strokeWidth={2.25} />
            Tu ruta de derechos
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-2.5">
            {result.titulo}
          </h1>
          <p className="text-slate-700 text-[14px] max-w-lg mx-auto leading-relaxed font-normal">
            {result.resumen}
          </p>
        </div>

        {/* ── Nivel de protección actual ── */}
        <LevelBadge nivel={result.nivel_riesgo} />

        {/* ── Dato clave ── */}
        {result.dato_clave && (
          <div className="flex items-start gap-3 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl px-5 py-4 shadow-lg shadow-indigo-700/20">
            <span className="shrink-0 size-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mt-0.5">
              <BarChart3 className="size-4.5 text-white" strokeWidth={2} />
            </span>
            <p className="text-[13px] font-medium leading-relaxed pt-0.5">{result.dato_clave}</p>
          </div>
        )}

        {/* ── Roadmap Timeline ── */}
        <div className="space-y-1">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 px-1 mb-3">
            Tu ruta de acción
          </h2>
          <div>
            {result.pasos.map((p, i) => (
              <RoadmapStep
                key={i}
                numero={p.numero}
                icono={p.icono}
                titulo={p.titulo}
                descripcion={p.descripcion}
                accion={p.accion}
                url={p.url}
                isLast={i === result.pasos.length - 1}
              />
            ))}
          </div>
        </div>

        {/* ── Programas (Bento) ── */}
        {result.programas?.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 px-1">
              Oportunidades disponibles para ti
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {result.programas.map((prog, i) => (
                <button
                  key={i}
                  onClick={() => openLink(prog.url)}
                  className="min-h-[64px] flex items-start gap-3 bg-white rounded-2xl border border-slate-200 px-4 py-3.5 hover:border-indigo-300 hover:shadow-md transition-all group fade-up text-left w-full"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="text-2xl shrink-0 leading-none mt-0.5">{prog.icono}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate tracking-tight">{prog.nombre}</p>
                    <p className="text-[12px] text-slate-600 leading-relaxed mt-0.5 font-medium">{prog.descripcion}</p>
                  </div>
                  <ExternalLink className="size-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 mt-1 transition-colors" strokeWidth={2.25} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Aviso informativo (no rojo) ── */}
        <div className="flex items-start gap-3 bg-amber-50/70 border border-amber-200 rounded-2xl px-4 py-3.5">
          <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-[11.5px] text-amber-900 leading-relaxed font-medium">{result.aviso_legal}</p>
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={onDeepConsult}
            className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-bold text-[14px] shadow-lg shadow-indigo-700/25 hover:from-indigo-500 hover:to-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-center"
          >
            <MessageSquare className="size-4.5 shrink-0" strokeWidth={2} />
            <span>Hacer consulta profunda</span>
          </button>
          <button
            onClick={onReset}
            className="flex-1 sm:flex-none sm:w-48 min-h-[48px] rounded-2xl border border-slate-200 text-slate-700 font-semibold text-[13.5px] hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-1.5 text-center"
          >
            <ArrowLeft className="size-4 shrink-0" strokeWidth={2.25} />
            <span>Nuevo diagnóstico</span>
          </button>
        </div>

        {/* ── Líneas de apoyo (glassmorphism oscuro) ── */}
        <div className="bg-slate-900 rounded-2xl px-5 py-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-emerald-400" strokeWidth={2} />
            <p className="text-white font-semibold text-[13px]">¿Necesitas hablar con alguien ahora?</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { n: "123", d: "Emergencias" },
              { n: "141", d: "ICBF" },
              { n: "155", d: "Víctimas" },
            ].map((l) => (
              <div key={l.n} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-1.5">
                <span className="text-white font-bold text-[13px]">{l.n}</span>
                <span className="text-slate-300 text-[11px] font-medium">{l.d}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10.5px] text-slate-500 pb-2 font-medium">
          República de Colombia · Navegador Social de Derechos · v3.0
        </p>
      </div>
    </div>
  );
}
