"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  type TriajeRequest, type Actividad, type EstadoSalud,
  ACTIVIDAD_LABELS, SALUD_LABELS,
} from "@/lib/triajeClient";

interface Props {
  onSubmit: (data: TriajeRequest) => Promise<void>;
  loading: boolean;
}

// ── Opciones de actividad con iconos y descripción corta ─────────────────────
const ACTIVIDAD_OPTIONS: { value: Actividad; icono: string; label: string; sub: string }[] = [
  { value: "informal",   icono: "🔨", label: "Informal / por días", sub: "Rebusque, ventas, oficios" },
  { value: "cuidador",   icono: "💛", label: "Cuidador/a no remunerado/a", sub: "Cuido familia sin pago" },
  { value: "temporal",   icono: "📋", label: "Contrato temporal", sub: "Obra, prestación, fijo" },
  { value: "estudiante", icono: "🎓", label: "Estudiante", sub: "Tiempo completo o parcial" },
  { value: "formal",     icono: "💼", label: "Empleo formal", sub: "Contrato indefinido / empresa" },
];

const SALUD_OPTIONS: { value: EstadoSalud; icono: string; label: string; sub: string }[] = [
  { value: "subsidiado",     icono: "🏥", label: "Sisbén Subsidiado", sub: "El Estado paga mi salud" },
  { value: "beneficiario",   icono: "👨‍👩‍👧", label: "Beneficiario de familiar", sub: "Estoy en el seguro de otro" },
  { value: "cotizante",      icono: "✅", label: "Cotizante Contributivo", sub: "Pago (o me descuentan) EPS" },
  { value: "sin_afiliacion", icono: "⚠️", label: "Sin afiliación", sub: "No tengo salud activa" },
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
          <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-200 text-blue-700 text-[11.5px] font-semibold px-3 py-1.5 rounded-full mb-4">
            <span>🇨🇴</span>
            <span>Diagnóstico gratuito · Basado en Ley 100/1993</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-2">
            Conoce tu <span className="text-blue-700">Mapa de Derechos</span>
          </h1>
          <p className="text-slate-500 text-[14px] max-w-md mx-auto leading-relaxed font-normal">
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
                {ACTIVIDAD_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setForm(f => ({ ...f, actividad: o.value }))}
                    className={cn(
                      "w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 border text-left transition-all",
                      form.actividad === o.value
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700"
                    )}
                  >
                    <span className="text-[22px] shrink-0">{o.icono}</span>
                    <div>
                      <p className={cn("text-[13.5px] font-semibold", form.actividad === o.value ? "text-white" : "text-slate-800")}>{o.label}</p>
                      <p className={cn("text-[11.5px]", form.actividad === o.value ? "text-blue-200" : "text-slate-400")}>{o.sub}</p>
                    </div>
                    {form.actividad === o.value && (
                      <svg className="ml-auto size-5 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </button>
                ))}
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
                {SALUD_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setForm(f => ({ ...f, salud: o.value }))}
                    className={cn(
                      "w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 border text-left transition-all",
                      form.salud === o.value
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700"
                    )}
                  >
                    <span className="text-[22px] shrink-0">{o.icono}</span>
                    <div>
                      <p className={cn("text-[13.5px] font-semibold", form.salud === o.value ? "text-white" : "text-slate-800")}>{o.label}</p>
                      <p className={cn("text-[11.5px]", form.salud === o.value ? "text-blue-200" : "text-slate-400")}>{o.sub}</p>
                    </div>
                    {form.salud === o.value && (
                      <svg className="ml-auto size-5 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </button>
                ))}
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
                <p className="text-slate-500 text-[12.5px] mb-5">Mueve el control para ajustar el monto.</p>

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
                <p className="text-slate-500 text-[12.5px] mb-4">Tu edad define los programas disponibles.</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm(f => ({ ...f, edad: Math.max(14, (f.edad ?? 25) - 1) }))}
                    className="size-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-xl font-bold transition-colors">−</button>
                  <div className="flex-1 text-center">
                    <span className="text-[36px] font-bold text-blue-700">{form.edad ?? 25}</span>
                    <span className="text-slate-400 text-[14px] ml-1">años</span>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, edad: Math.min(80, (f.edad ?? 25) + 1) }))}
                    className="size-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-xl font-bold transition-colors">+</button>
                </div>
              </div>

              {/* Cuidador toggle */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-slate-800">¿Realizas trabajo de cuidado?</p>
                    <p className="text-[12px] text-slate-500">Cuidar hijos, adultos mayores o personas con discapacidad</p>
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
                      <span className="text-[12.5px] text-slate-500">{r.label}</span>
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
            <button onClick={back} className="flex-1 sm:flex-none sm:w-32 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-[13.5px] transition-colors">
              ← Atrás
            </button>
          )}

          {paso !== "Resumen" ? (
            <button
              onClick={next}
              disabled={!canContinue}
              className={cn(
                "flex-1 py-3 rounded-2xl font-bold text-[14px] transition-all",
                canContinue
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/25 active:scale-[0.98]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              Continuar →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold text-[14.5px] shadow-xl shadow-blue-900/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  Analizando tu situación…
                </>
              ) : (
                <>
                  🗺️ Ver mi Mapa de Derechos
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
