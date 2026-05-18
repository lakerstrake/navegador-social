"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer, HeartHandshake, ClipboardList, GraduationCap, Briefcase, RefreshCw,
  Stethoscope, Users, ShieldCheck, AlertCircle, Check, Minus, Plus, MapPinned,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type TriajeRequest, type Actividad, type EstadoSalud,
  ACTIVIDAD_LABELS, SALUD_LABELS,
} from "@/lib/triajeClient";

// ── Loading cycler — mensajes empáticos ──────────────────────────────────────
const LOADING_MESSAGES = [
  "Organizando la normativa a tu favor…",
  "Identificando oportunidades de protección…",
  "Trazando tu ruta de derechos…",
];

function LoadingCycler() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-flex h-[1.2em] overflow-hidden items-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
          className="block whitespace-nowrap"
        >
          {LOADING_MESSAGES[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

interface Props {
  onSubmit: (data: TriajeRequest) => Promise<void>;
  loading: boolean;
}

// ── Opciones de actividad — íconos Lucide empáticos ──────────────────────────
const ACTIVIDAD_OPTIONS: { value: Actividad; Icon: LucideIcon; label: string; sub: string }[] = [
  { value: "informal",   Icon: Hammer,         label: "Trabajo informal",          sub: "Rebusque, ventas, oficios por día" },
  { value: "cuidador",   Icon: HeartHandshake, label: "Cuidador/a no remunerado/a", sub: "Cuido familia sin recibir pago" },
  { value: "temporal",   Icon: ClipboardList,  label: "Contrato temporal",          sub: "Obra labor, prestación, fijo" },
  { value: "estudiante", Icon: GraduationCap,  label: "Estudiante",                 sub: "Tiempo completo o parcial" },
  { value: "formal",     Icon: Briefcase,      label: "Empleo formal",              sub: "Contrato indefinido en empresa" },
  { value: "nini",       Icon: RefreshCw,      label: "Buscando mi próximo paso",   sub: "Por ahora no estudio ni trabajo" },
];

const SALUD_OPTIONS: { value: EstadoSalud; Icon: LucideIcon; label: string; sub: string }[] = [
  { value: "subsidiado",     Icon: Stethoscope,  label: "Sisbén · Subsidiado",       sub: "El Estado cubre mi salud" },
  { value: "beneficiario",   Icon: Users,        label: "Beneficiario familiar",     sub: "Estoy en el plan de otro" },
  { value: "cotizante",      Icon: ShieldCheck,  label: "Cotizante contributivo",    sub: "Pago (o me descuentan) EPS" },
  { value: "sin_afiliacion", Icon: AlertCircle,  label: "Sin afiliación activa",     sub: "Aún no tengo cobertura" },
];

const PASOS = ["Actividad", "Salud", "Ahorro", "Resumen"] as const;
type Paso = typeof PASOS[number];

function formatCOP(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

export default function SocialTriageForm({ onSubmit, loading }: Props) {
  const [paso, setPaso] = useState<Paso>("Actividad");
  const [form, setForm] = useState<Partial<TriajeRequest>>({ ahorro_mensual: 0, cuidador: false, edad: 25 });

  const pasoIdx = PASOS.indexOf(paso);

  function next() { setPaso(PASOS[pasoIdx + 1] as Paso); }
  function back() { setPaso(PASOS[pasoIdx - 1] as Paso); }

  function handleSubmit() {
    onSubmit(form as TriajeRequest);
  }

  const canContinue =
    (paso === "Actividad" && form.actividad) ||
    (paso === "Salud"     && form.salud)     ||
    (paso === "Ahorro"    && form.edad)      ||
    paso === "Resumen";

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* ── Hero ── */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11.5px] font-semibold px-3 py-1.5 rounded-full mb-4">
            <MapPinned className="size-3.5" strokeWidth={2} />
            <span>Diagnóstico gratuito · Normativa colombiana</span>
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-2">
            Descubre tu <span className="text-indigo-700">Ruta de Derechos</span>
          </h1>
          <p className="text-slate-600 text-[14px] max-w-md mx-auto leading-relaxed font-normal">
            4 preguntas · menos de 2 minutos · orientación personalizada sobre
            pensiones, BEPS y protección social.
          </p>
        </div>

        {/* ── Barra de progreso ── */}
        <div className="flex items-center gap-2">
          {PASOS.map((p, i) => (
            <div key={p} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                "w-full h-1.5 rounded-full transition-all duration-300",
                i < pasoIdx  ? "bg-blue-600" :
                i === pasoIdx ? "bg-blue-400" :
                                "bg-slate-200"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                i === pasoIdx ? "text-blue-700" : "text-slate-400"
              )}>{p}</span>
            </div>
          ))}
        </div>

        {/* ── PASO 1: Actividad ── */}
        {paso === "Actividad" && (
          <div className="fade-up space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pregunta 1 de 4</p>
              <h2 className="text-[17px] font-bold text-slate-800 mb-4">
                ¿Cuál es tu actividad principal?
              </h2>
              <div className="space-y-2">
                {ACTIVIDAD_OPTIONS.map((o) => {
                  const selected = form.actividad === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setForm(f => ({ ...f, actividad: o.value }))}
                      aria-pressed={selected}
                      className={cn(
                        "w-full min-h-[56px] flex items-center gap-3.5 rounded-xl px-4 py-3.5 border-2 text-left transition-all",
                        selected
                          ? "bg-indigo-50/60 border-indigo-600 shadow-sm shadow-indigo-600/10 ring-1 ring-indigo-600/10"
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                      )}
                    >
                      <span className={cn(
                        "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        <o.Icon className="size-5" strokeWidth={1.75} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[14px] font-semibold leading-tight tracking-tight", selected ? "text-indigo-900" : "text-slate-800")}>{o.label}</p>
                        <p className={cn("text-[12px] mt-0.5 leading-snug font-medium", selected ? "text-indigo-700" : "text-slate-600")}>{o.sub}</p>
                      </div>
                      {selected && (
                        <span className="ml-auto size-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="size-3.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 2: Salud ── */}
        {paso === "Salud" && (
          <div className="fade-up space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pregunta 2 de 4</p>
              <h2 className="text-[17px] font-bold text-slate-800 mb-4">
                ¿Cómo estás afiliado/a a salud?
              </h2>
              <div className="space-y-2">
                {SALUD_OPTIONS.map((o) => {
                  const selected = form.salud === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setForm(f => ({ ...f, salud: o.value }))}
                      aria-pressed={selected}
                      className={cn(
                        "w-full min-h-[56px] flex items-center gap-3.5 rounded-xl px-4 py-3.5 border-2 text-left transition-all",
                        selected
                          ? "bg-indigo-50/60 border-indigo-600 shadow-sm shadow-indigo-600/10 ring-1 ring-indigo-600/10"
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                      )}
                    >
                      <span className={cn(
                        "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        <o.Icon className="size-5" strokeWidth={1.75} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[14px] font-semibold leading-tight tracking-tight", selected ? "text-indigo-900" : "text-slate-800")}>{o.label}</p>
                        <p className={cn("text-[12px] mt-0.5 leading-snug font-medium", selected ? "text-indigo-700" : "text-slate-600")}>{o.sub}</p>
                      </div>
                      {selected && (
                        <span className="ml-auto size-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="size-3.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 3: Ahorro y edad ── */}
        {paso === "Ahorro" && (
          <div className="fade-up space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pregunta 3 de 4</p>
                <h2 className="text-[17px] font-bold text-slate-800 mb-1">¿Cuánto puedes ahorrar al mes?</h2>
                <p className="text-slate-600 text-[12.5px] mb-5">Mueve el control para ajustar el monto.</p>

                {/* Valor mostrado */}
                <div className="text-center mb-4">
                  <span className="text-[32px] font-bold text-blue-700">
                    {formatCOP(form.ahorro_mensual ?? 0)}
                  </span>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">pesos colombianos / mes</p>
                </div>

                {/* Slider */}
                <input
                  type="range" min={0} max={150000} step={5000}
                  value={form.ahorro_mensual ?? 0}
                  onChange={(e) => setForm(f => ({ ...f, ahorro_mensual: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10.5px] text-slate-400 mt-1">
                  <span>$0</span>
                  <span>$75.000</span>
                  <span>$150.000</span>
                </div>

                {/* Contexto BEPS */}
                {(form.ahorro_mensual ?? 0) >= 5000 && (
                  <div className="mt-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                    <span className="text-emerald-500 text-lg shrink-0">✅</span>
                    <p className="text-[12px] text-emerald-800">
                      Con <strong>{formatCOP(form.ahorro_mensual ?? 0)}/mes</strong> puedes abrir una cuenta BEPS.
                      El Estado añade el <strong>20% adicional</strong> a tu ahorro.
                    </p>
                  </div>
                )}
                {(form.ahorro_mensual ?? 0) === 0 && (
                  <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <span className="text-amber-500 text-lg shrink-0">💡</span>
                    <p className="text-[12px] text-amber-800">
                      Sin capacidad de ahorro ahora, BEPS te permite empezar con <strong>$5.000/mes</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Edad */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-[15px] font-bold text-slate-800 mb-1">¿Cuántos años tienes?</h3>
                <p className="text-slate-600 text-[12.5px] mb-4">Tu edad define los programas disponibles.</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm(f => ({ ...f, edad: Math.max(14, (f.edad ?? 25) - 1) }))}
                    aria-label="Disminuir edad"
                    className="min-h-[44px] min-w-[44px] rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors">
                    <Minus className="size-4" strokeWidth={2.5} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-[36px] font-bold text-indigo-900 tracking-tight">{form.edad ?? 25}</span>
                    <span className="text-slate-500 text-[14px] ml-1 font-medium">años</span>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, edad: Math.min(80, (f.edad ?? 25) + 1) }))}
                    aria-label="Aumentar edad"
                    className="min-h-[44px] min-w-[44px] rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors">
                    <Plus className="size-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Cuidador toggle */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-slate-800">¿Realizas trabajo de cuidado?</p>
                    <p className="text-[12px] text-slate-600">Cuidar hijos, adultos mayores o personas con discapacidad</p>
                  </div>
                  <button
                    onClick={() => setForm(f => ({ ...f, cuidador: !f.cuidador }))}
                    className={cn(
                      "relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none",
                      form.cuidador ? "bg-blue-600" : "bg-slate-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block size-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5",
                      form.cuidador ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
                {form.cuidador && (
                  <div className="mt-3 flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5">
                    <span className="text-purple-500 text-lg shrink-0">💜</span>
                    <p className="text-[12px] text-purple-800">
                      La <strong>Ley 2040/2020</strong> reconoce el trabajo de cuidado.
                      Existen rutas previsionales específicas para ti.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 4: Resumen ── */}
        {paso === "Resumen" && (
          <div className="fade-up space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Confirmación</p>
              <h2 className="text-[17px] font-bold text-slate-800 mb-4">Tu perfil de diagnóstico</h2>

              <div className="space-y-2.5">
                {[
                  { label: "Actividad", value: ACTIVIDAD_LABELS[form.actividad!], icono: "💼" },
                  { label: "Salud", value: SALUD_LABELS[form.salud!], icono: "⚕️" },
                  { label: "Ahorro mensual", value: formatCOP(form.ahorro_mensual ?? 0), icono: "💰" },
                  { label: "Trabajo de cuidado", value: form.cuidador ? "Sí" : "No", icono: "💛" },
                  { label: "Edad", value: `${form.edad} años`, icono: "👤" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{r.icono}</span>
                      <span className="text-[12.5px] text-slate-600">{r.label}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-slate-800">{r.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                <span className="text-blue-500 text-lg shrink-0">🔒</span>
                <p className="text-[11.5px] text-blue-800">
                  Esta información es solo para generar tu orientación. No se almacena ni se comparte.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Navegación ── */}
        <div className="flex gap-3">
          {pasoIdx > 0 && (
            <button onClick={back} className="flex-1 sm:flex-none sm:w-32 min-h-[48px] rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold text-[13.5px] transition-colors">
              ← Atrás
            </button>
          )}

          {paso !== "Resumen" ? (
            <button
              onClick={next}
              disabled={!canContinue}
              className={cn(
                "flex-1 min-h-[48px] rounded-2xl font-bold text-[14.5px] tracking-tight transition-all",
                canContinue
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              Continuar →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold text-[14.5px] shadow-xl shadow-indigo-900/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <svg className="size-5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  <LoadingCycler />
                </>
              ) : (
                <>
                  <MapPinned className="size-5" strokeWidth={2} />
                  Ver mi Ruta de Derechos
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 pb-2">
          Orientación basada en normativa colombiana vigente · No reemplaza asesoría jurídica profesional
        </p>
      </div>
    </div>
  );
}
