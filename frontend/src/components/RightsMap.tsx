"use client";

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

function RiskBadge({ nivel }: { nivel: TriajeResult["nivel_riesgo"] }) {
  const cfg = RIESGO_CONFIG[nivel];
  const barColors: Record<string, string[]> = {
    ROJO:     ["bg-red-500",   "bg-red-500",   "bg-red-500"],
    AMARILLO: ["bg-emerald-400","bg-amber-400", "bg-slate-200"],
    VERDE:    ["bg-emerald-400","bg-slate-200", "bg-slate-200"],
  };
  const bars = barColors[nivel];
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border px-5 py-4", cfg.bg, cfg.border)}>
      <div className="flex gap-1 items-end h-8">
        {bars.map((c, i) => (
          <div key={i} className={cn("w-2.5 rounded-full", c)} style={{ height: `${(i + 1) * 33}%` }} />
        ))}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[22px]">{cfg.emoji}</span>
          <span className={cn("text-[15px] font-extrabold uppercase tracking-wide", cfg.text)}>{cfg.label}</span>
        </div>
        <p className={cn("text-[12px]", cfg.text, "opacity-80")}>{cfg.description}</p>
      </div>
    </div>
  );
}

export default function RightsMap({ result, onReset, onDeepConsult }: Props) {
  const cfg = RIESGO_CONFIG[result.nivel_riesgo];

  return (
    <div className="flex flex-col min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-5">

        {/* ── Header resultado ── */}
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold px-3 py-1 rounded-full mb-3 shadow-sm">
            🗺️ Mi Mapa de Derechos
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-2">{result.titulo}</h1>
          <p className="text-slate-500 text-[14px] max-w-lg mx-auto leading-relaxed font-normal">{result.resumen}</p>
        </div>

        {/* ── Semáforo de riesgo ── */}
        <RiskBadge nivel={result.nivel_riesgo} />

        {/* ── Dato clave ── */}
        {result.dato_clave && (
          <div className="flex items-start gap-3 bg-blue-600 text-white rounded-2xl px-5 py-4 shadow-lg shadow-blue-600/20">
            <span className="text-2xl shrink-0 mt-0.5">📊</span>
            <p className="text-[13px] font-medium leading-relaxed">{result.dato_clave}</p>
          </div>
        )}

        {/* ── Pasos accionables ── */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 px-1">Tu ruta de acción</h2>
          {result.pasos.map((paso, i) => (
            <div key={i}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 transition-all fade-up"
              style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start gap-4 p-4">
                <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-[13px] shrink-0 shadow-md shadow-blue-600/20">
                  {paso.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-[18px] shrink-0">{paso.icono}</span>
                    <h3 className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">{paso.titulo}</h3>
                  </div>
                  <p className="text-[13px] text-slate-500 leading-relaxed font-normal">{paso.descripcion}</p>
                </div>
              </div>
              {paso.url && (
                <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
                  <button onClick={() => openLink(paso.url!)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    {paso.accion}
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Programas recomendados ── */}
        {result.programas?.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 px-1">Programas disponibles para ti</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {result.programas.map((prog, i) => (
                <button key={i} onClick={() => openLink(prog.url)}
                  className="flex items-start gap-3 bg-white rounded-2xl border border-slate-200 px-4 py-3.5 hover:border-blue-300 hover:shadow-md transition-all group fade-up text-left w-full"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="text-2xl shrink-0">{prog.icono}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate tracking-tight">{prog.nombre}</p>
                    <p className="text-[12px] text-slate-400 leading-snug mt-0.5 font-normal">{prog.descripcion}</p>
                  </div>
                  <svg className="size-4 text-slate-300 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Aviso legal ── */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
          <span className="text-amber-500 text-lg shrink-0">⚠️</span>
          <p className="text-[11.5px] text-amber-800 leading-relaxed">{result.aviso_legal}</p>
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button onClick={onDeepConsult}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold text-[14px] shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Hacer consulta profunda
          </button>
          <button onClick={onReset}
            className="flex-1 sm:flex-none sm:w-44 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-[13.5px] hover:bg-slate-50 transition-colors">
            ← Nuevo diagnóstico
          </button>
        </div>

        {/* Líneas de emergencia */}
        <div className="bg-slate-900 rounded-2xl px-5 py-4 flex flex-wrap gap-3 items-center justify-between">
          <p className="text-white font-semibold text-[13px]">¿Necesitas hablar con alguien ahora?</p>
          <div className="flex gap-2 flex-wrap">
            {[{ n: "123", d: "Emergencias" }, { n: "141", d: "ICBF" }, { n: "155", d: "Víctimas" }].map((l) => (
              <div key={l.n} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5">
                <span className="text-white font-bold text-[13px]">{l.n}</span>
                <span className="text-slate-400 text-[11px]">{l.d}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10.5px] text-slate-400 pb-2">
          República de Colombia · Navegador Social de Derechos · v3.0
        </p>
      </div>
    </div>
  );
}
