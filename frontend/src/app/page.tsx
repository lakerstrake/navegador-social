"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Stethoscope, Map as MapIcon, MessageSquare, Send, Copy, Check,
  Menu, X, ChevronRight, ExternalLink,
  Building2, Heart, Briefcase, Users, Wallet, Shield,
  Globe, Wifi, WifiOff, Loader2, AlertTriangle, Zap, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SocialTriageForm from "@/components/SocialTriageForm";
import RightsMap from "@/components/RightsMap";
import WelcomeHero from "@/components/WelcomeHero";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";
import { ExternalLinkBridge, openSafe } from "@/components/ExternalLinkBridge";
import { runTriaje, sendChat, type TriajeRequest } from "@/lib/triajeClient";
import { useDiagnostico } from "@/hooks/useDiagnostico";

type Phase = "hydrating" | "welcome" | "app";
const WELCOME_KEY = "hasSeenWelcome";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";
type Screen    = "triaje" | "mapa" | "consultas";
type Rol       = "usuario" | "asistente" | "sistema";
type Mensaje   = { id: number; rol: Rol; texto: string; hora: string };
type ApiEstado = "conectando" | "ok" | "error";
const horaActual = () =>
  new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

const WELCOME_MENSAJE: Mensaje = {
  id: 0,
  rol: "asistente",
  texto:
    "Hola, soy el **Navegador Social de Derechos**, asistente institucional del Estado colombiano.\n\n" +
    "Puedo orientarte en:\n" +
    "• **Pensiones y BEPS** — Ley 100/1993 y Decreto 604/2013\n" +
    "• **Salud y EPS** — Ley 1438/2011 y régimen subsidiado\n" +
    "• **Derechos laborales** — Código Sustantivo del Trabajo\n" +
    "• **Subsidios y Sisbén IV** — Familias en Acción y Mi Casa Ya\n" +
    "• **Víctimas del conflicto** — Ley 1448/2011 y RUV\n" +
    "• **Familia y niñez** — Ley 1098/2006 e ICBF\n\n" +
    "¿En qué te puedo ayudar hoy?",
  hora: "",
};

// ── Action cards institucionales (post-procesamiento frontend) ─────────────
interface ActionCard {
  url: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
}
const INSTITUTIONAL_ACTIONS: { match: RegExp; card: ActionCard }[] = [
  {
    match: /\b(colpensiones|pensi[oó]n(?!ado)|beps|cotizaci[oó]n|cotiza(?:nte|r))\b/i,
    card: {
      url: "https://www.colpensiones.gov.co/",
      label: "Visitar el portal de Colpensiones",
      hint: "Pensiones, BEPS y aportes",
      Icon: Building2,
    },
  },
  {
    match: /\b(desempleo|informal(?:idad)?|empleo formal|servicio.{0,3}p[uú]blico.{0,3}empleo|buscar (?:trabajo|empleo))\b/i,
    card: {
      url: "https://www.serviciodeempleo.gov.co/",
      label: "Buscar empleo formal en el Servicio Público de Empleo",
      hint: "Vacantes y rutas de empleabilidad",
      Icon: Briefcase,
    },
  },
];

function detectActionCards(texto: string): ActionCard[] {
  const found = new Map<string, ActionCard>();
  for (const { match, card } of INSTITUTIONAL_ACTIONS) {
    if (match.test(texto) && card.url.startsWith("https://")) {
      found.set(card.url, card);
    }
  }
  return Array.from(found.values());
}

// ── Datos ──────────────────────────────────────────────────────────────────────
interface ConsultaItem {
  id: string;
  Icon: LucideIcon;
  label: string;
  grad: string;
  accent: string;
  accentBg: string;
  hoverBorder: string;
  featured?: boolean;
  preguntas: string[];
}

const CONSULTAS: ConsultaItem[] = [
  {
    id: "pensiones", Icon: Building2, label: "Pensiones",
    grad: "from-blue-500 to-indigo-600",
    accent: "text-blue-600", accentBg: "bg-blue-50", hoverBorder: "hover:border-blue-200",
    featured: true,
    preguntas: [
      "¿Cuáles son los requisitos para pensión de vejez en Colpensiones según la Ley 100?",
      "¿En qué se diferencia Colpensiones de una AFP privada?",
      "¿Cómo funciona el programa BEPS y quiénes pueden acceder?",
    ],
  },
  {
    id: "salud", Icon: Heart, label: "Salud",
    grad: "from-emerald-500 to-teal-600",
    accent: "text-emerald-600", accentBg: "bg-emerald-50", hoverBorder: "hover:border-emerald-200",
    preguntas: [
      "¿Qué cubre el Plan de Beneficios en Salud según la Ley 1751?",
      "¿Cómo afiliarme al régimen subsidiado si no tengo ingresos?",
      "¿Qué hago si mi EPS niega un servicio incluido en el PBS?",
    ],
  },
  {
    id: "trabajo", Icon: Briefcase, label: "Derechos Laborales",
    grad: "from-amber-500 to-orange-500",
    accent: "text-amber-600", accentBg: "bg-amber-50", hoverBorder: "hover:border-amber-200",
    preguntas: [
      "¿Cuáles son mis prestaciones obligatorias según el Código Sustantivo del Trabajo?",
      "¿Cómo denunciar acoso laboral ante MinTrabajo según la Ley 1010?",
      "¿Qué derechos tengo como trabajador informal?",
    ],
  },
  {
    id: "familia", Icon: Users, label: "Familia y Niñez",
    grad: "from-violet-500 to-purple-600",
    accent: "text-violet-600", accentBg: "bg-violet-50", hoverBorder: "hover:border-violet-200",
    preguntas: [
      "¿Cómo solicitar medidas de protección por violencia intrafamiliar?",
      "¿Qué derechos tienen los niños según el Código de Infancia y Adolescencia?",
      "¿Cómo denunciar maltrato infantil al ICBF?",
    ],
  },
  {
    id: "subsidios", Icon: Wallet, label: "Subsidios",
    grad: "from-rose-500 to-pink-500",
    accent: "text-rose-600", accentBg: "bg-rose-50", hoverBorder: "hover:border-rose-200",
    preguntas: [
      "¿Cómo inscribirse en Familias en Acción de Prosperidad Social?",
      "¿Qué es el SISBEN IV y cómo afecta mi acceso a subsidios?",
      "¿Cómo acceder al subsidio Mi Casa Ya?",
    ],
  },
  {
    id: "victimas", Icon: Shield, label: "Víctimas",
    grad: "from-slate-500 to-slate-700",
    accent: "text-slate-600", accentBg: "bg-slate-100", hoverBorder: "hover:border-slate-300",
    preguntas: [
      "¿Cómo inscribirse en el Registro Único de Víctimas según la Ley 1448?",
      "¿Qué medidas de reparación reconoce la Ley de Víctimas?",
      "¿Cuál es el proceso para solicitar indemnización ante la UARIV?",
    ],
  },
];

const RECURSOS = [
  { nombre: "Portal Único del Estado",  url: "https://www.gov.co" },
  { nombre: "BEPS – Colpensiones",      url: "https://www.beps.gov.co" },
  { nombre: "Colpensiones",             url: "https://www.colpensiones.gov.co" },
  { nombre: "MinTrabajo",               url: "https://www.mintrabajo.gov.co" },
  { nombre: "MinSalud",                 url: "https://www.minsalud.gov.co" },
  { nombre: "Prosperidad Social",       url: "https://prosperidadsocial.gov.co" },
  { nombre: "ICBF",                     url: "https://www.icbf.gov.co" },
  { nombre: "UARIV – Víctimas",         url: "https://www.unidadvictimas.gov.co" },
  { nombre: "Defensoría del Pueblo",    url: "https://www.defensoria.gov.co" },
  { nombre: "SENA",                     url: "https://www.sena.edu.co" },
];

// ── Animation variants ─────────────────────────────────────────────────────────
const EASE_SMOOTH = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_SMOOTH } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.14 } },
};

const bentoContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.065, delayChildren: 0.08 } },
};

const bentoItem = {
  hidden:  { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.28, ease: EASE_SMOOTH } },
};

// ── Markdown renderer ──────────────────────────────────────────────────────────
function Texto({ texto, dark = false }: { texto: string; dark?: boolean }) {
  return (
    <div className={cn("space-y-2 text-[13.5px] leading-relaxed tracking-[-0.005em]", dark ? "text-blue-50" : "text-slate-700")}>
      {texto.split("\n").map((l, i) => {
        if (!l.trim()) return <div key={i} className="h-1" />;
        const html = l
          .replace(/\*\*(.*?)\*\*/g, `<strong class="${dark ? "text-white" : "text-slate-900"} font-semibold">$1</strong>`)
          .replace(/^[•\-]\s/, "• ");
        return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

function CopyBtn({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-100"
    >
      {ok
        ? <Check  className="size-3.5 text-emerald-500" />
        : <Copy   className="size-3.5 text-slate-400"   />
      }
    </button>
  );
}

// ── Bento Grid ─────────────────────────────────────────────────────────────────
function BentoGrid({ onQuestion }: { onQuestion: (q: string) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
      <div className="mb-3 sm:mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Consultas profundas
        </p>
        <h2 className="text-[19px] sm:text-[24px] font-extrabold text-slate-900 mt-0.5 tracking-tight leading-[1.15]">
          ¿En qué puedo ayudarte?
        </h2>
        <p className="text-[12px] sm:text-[13px] text-slate-600 mt-1 font-normal leading-snug">
          Selecciona un área o escribe tu pregunta
        </p>
      </div>

      <motion.div
        variants={bentoContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5"
      >
        {CONSULTAS.map((cat) => (
          <motion.div
            key={cat.id}
            variants={bentoItem}
            whileHover={{ y: -3, transition: { duration: 0.18 } }}
            className={cn(
              "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",
              "hover:shadow-lg transition-shadow",
              cat.hoverBorder,
              cat.featured && "lg:col-span-2"
            )}
          >
            {/* Gradient accent bar */}
            <div className={cn("h-[2.5px] w-full bg-gradient-to-r", cat.grad)} />

            {/* Header */}
            <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2">
              <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0", cat.accentBg)}>
                <cat.Icon className={cn("size-3.5", cat.accent)} strokeWidth={1.75} />
              </div>
              <span className="font-bold text-[12.5px] text-slate-800 tracking-tight leading-tight">{cat.label}</span>
            </div>

            {/* Questions */}
            <div className="px-2 pb-2 space-y-0.5">
              {cat.preguntas.map((p) => (
                <button
                  key={p}
                  onClick={() => onQuestion(p)}
                  className={cn(
                    "w-full min-h-[36px] text-left text-[11.5px] text-slate-600 leading-snug rounded-lg px-2 py-1.5",
                    "hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 border border-transparent hover:border-slate-100",
                    "transition-all flex items-start gap-1.5 group/q font-medium"
                  )}
                >
                  <ArrowRight className="size-3 mt-0.5 text-slate-400 group-hover/q:text-indigo-500 shrink-0 transition-colors" />
                  <span className="line-clamp-2">{p}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Chat Messages ──────────────────────────────────────────────────────────────
function ChatMessages({
  mensajes,
  chatLoading,
  bottomRef,
}: {
  mensajes: Mensaje[];
  chatLoading: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      {mensajes.map((m) => {
        if (m.rol === "sistema") return (
          <motion.div key={m.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 max-w-lg w-full shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                <span className="text-[10.5px] font-bold text-amber-700 uppercase tracking-wide">Aviso</span>
              </div>
              <Texto texto={m.texto} />
            </div>
          </motion.div>
        );

        if (m.rol === "usuario") return (
          <motion.div key={m.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-end items-end gap-2.5">
            <div className="flex flex-col items-end gap-1 max-w-[82%] sm:max-w-[76%]">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-md shadow-blue-600/20">
                <Texto texto={m.texto} dark />
              </div>
              <span className="text-[10px] text-slate-400 px-1">{m.hora}</span>
            </div>
            <div className="size-7 shrink-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-500 mb-4 shadow-sm">TÚ</div>
          </motion.div>
        );

        const cards = detectActionCards(m.texto);
        return (
          <motion.div key={m.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-end gap-2.5 group">
            <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/20 mb-4">
              <Shield className="size-3.5 text-white" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-[82%] sm:max-w-[76%]">
              <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-sm px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow">
                <Texto texto={m.texto} />
                {cards.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    {cards.map(c => (
                      <button
                        key={c.url}
                        type="button"
                        onClick={() => openSafe(c.url)}
                        className="w-full flex items-center gap-3 min-h-[52px] rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 px-3 py-2.5 transition-colors group/card text-left cursor-pointer"
                      >
                        <span className="size-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20 pointer-events-none">
                          <c.Icon className="size-4 text-white" strokeWidth={2} />
                        </span>
                        <span className="flex-1 min-w-0 pointer-events-none">
                          <span className="block text-[12.5px] font-bold text-indigo-900 leading-tight tracking-tight">{c.label}</span>
                          <span className="block text-[10.5px] text-indigo-700 font-medium mt-0.5">{c.hint}</span>
                        </span>
                        <ExternalLink className="size-3.5 text-indigo-500 shrink-0 transition-transform group-hover/card:translate-x-0.5 pointer-events-none" strokeWidth={2.25} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-1">
                {m.hora && <span className="text-[10px] text-slate-500">{m.hora}</span>}
                {m.hora && <span className="text-[10px] text-slate-300">·</span>}
                <span className="text-[10px] text-slate-500 font-medium">Navegador Social</span>
                <CopyBtn texto={m.texto} />
              </div>
            </div>
          </motion.div>
        );
      })}

      {chatLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2.5">
          <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md mb-4">
            <Shield className="size-3.5 text-white" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-sm flex gap-1.5 items-center">
            {[0, 160, 320].map((d) => (
              <motion.span key={d} className="size-2 rounded-full bg-blue-400"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.85, repeat: Infinity, delay: d / 1000 }}
              />
            ))}
          </div>
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

// ── Loading Modal (overlay con backdrop-blur) ──────────────────────────────────
function LoadingModal({ open }: { open: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="loading-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Procesando tu diagnóstico"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 6,  scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/15 px-6 py-7 flex flex-col items-center justify-center text-center gap-4"
          >
            <motion.span
              className="relative flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Loader2 className="size-7 text-indigo-600 animate-spin" strokeWidth={2} />
            </motion.span>
            <div className="space-y-1.5">
              <p className="text-[15px] font-bold text-slate-900 tracking-tight">
                Organizando la normativa, por favor espera…
              </p>
              <p className="text-[12.5px] text-slate-600 leading-relaxed font-medium">
                Estamos trazando tu ruta de derechos con base en normativa colombiana vigente.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Magic Command Bar ──────────────────────────────────────────────────────────
function MagicCommandBar({
  input, setInput, onSend, loading, textareaRef, resize, focused, setFocused,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: (v: string) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  resize: () => void;
  focused: boolean;
  setFocused: (v: boolean) => void;
}) {
  return (
    <div className="shrink-0 px-4 pb-5 pt-3 bg-gradient-to-t from-white via-white/98 to-transparent">
      <motion.div
        className="max-w-2xl mx-auto"
        animate={{ scale: focused ? 1.008 : 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <motion.div
          animate={{
            boxShadow: focused
              ? "0 8px 40px -8px rgba(59,130,246,0.22), 0 2px 8px rgba(0,0,0,0.06)"
              : "0 4px 20px -4px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          }}
          transition={{ duration: 0.25 }}
          className={cn(
            "flex gap-2 items-center rounded-2xl border px-4 py-3",
            "bg-white/95 backdrop-blur-md transition-colors duration-200",
            focused ? "border-indigo-300" : "border-slate-200"
          )}
        >
          <Zap className={cn(
            "size-4 shrink-0 self-center transition-colors duration-200",
            focused ? "text-indigo-500" : "text-slate-400"
          )} />
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); resize(); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(input); }
            }}
            placeholder="Consulta sobre pensiones, salud, derechos laborales, BEPS, víctimas…"
            className="flex-1 resize-none bg-transparent text-[14px] sm:text-[13.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none leading-relaxed min-h-[36px] max-h-36 py-0.5"
          />
          <motion.button
            onClick={() => onSend(input)}
            disabled={!input.trim() || loading}
            whileTap={{ scale: 0.88 }}
            aria-label="Enviar consulta"
            className={cn(
              "size-11 sm:size-9 rounded-xl flex items-center justify-center shrink-0 self-center transition-colors duration-150",
              input.trim() && !loading
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            )}
          >
            {loading
              ? <Loader2 className="size-4 animate-spin" />
              : <Send    className="size-4" />
            }
          </motion.button>
        </motion.div>
        <p className="text-center text-[10.5px] text-slate-400 mt-2">
          Enter envía · Normativa colombiana vigente (Ley 100, BEPS, Ley 1448 y más)
        </p>
      </motion.div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const { result: triajeResult, setResult: setTriajeResult, screen, setScreen } = useDiagnostico();
  const [triajeLoading, setTriajeLoading] = useState(false);
  const [triajeError,   setTriajeError]   = useState<string | null>(null);
  const [mensajes,      setMensajes]      = useState<Mensaje[]>([WELCOME_MENSAJE]);
  const [input,         setInput]         = useState("");
  const [chatLoading,   setChatLoading]   = useState(false);
  const [apiEstado,     setApiEstado]     = useState<ApiEstado>("conectando");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [inputFocused,  setInputFocused]  = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Onboarding phase (hidratado contra sessionStorage) ──
  const [phase, setPhase] = useState<Phase>("hydrating");
  useEffect(() => {
    try {
      const seen = window.sessionStorage.getItem(WELCOME_KEY);
      setPhase(seen ? "app" : "welcome");
    } catch {
      setPhase("welcome");
    }
  }, []);
  const startApp = useCallback(() => {
    try { window.sessionStorage.setItem(WELCOME_KEY, "1"); } catch { /* ignore */ }
    setPhase("app");
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then(r => setApiEstado(r.ok ? "ok" : "error"))
      .catch(() => setApiEstado("error"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, chatLoading]);

  async function handleTriaje(data: TriajeRequest) {
    setTriajeLoading(true);
    setTriajeError(null);
    try {
      const result = await runTriaje(data);
      setTriajeResult(result);
      setScreen("mapa");
    } catch (e) {
      setTriajeError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setTriajeLoading(false);
    }
  }

  const enviarChat = useCallback(async (texto: string) => {
    const t = texto.trim();
    if (!t || chatLoading) return;
    setScreen("consultas");
    const id = Date.now();
    const historial = mensajes
      .filter(m => m.rol !== "sistema")
      .map(m => ({ rol: m.rol, texto: m.texto }));
    setMensajes(p => [...p, { id, rol: "usuario", texto: t, hora: horaActual() }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setChatLoading(true);
    try {
      const respuesta = await sendChat(t, historial);
      setMensajes(p => [...p, { id: id + 1, rol: "asistente", texto: respuesta, hora: horaActual() }]);
    } catch (e) {
      setMensajes(p => [...p, { id: id + 1, rol: "sistema", texto: e instanceof Error ? e.message : "Error", hora: horaActual() }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, mensajes]);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, []);

  const NAV_ITEMS = [
    { id: "triaje"    as Screen, Icon: Stethoscope,   label: "Diagnóstico",   sub: "Formulario de triaje"                             },
    { id: "mapa"      as Screen, Icon: MapIcon,        label: "Mi Mapa",       sub: triajeResult ? "Ver resultados" : "Sin diagnóstico" },
    { id: "consultas" as Screen, Icon: MessageSquare,  label: "Consultas IA",  sub: "Chat · Normativa colombiana"                      },
  ];

  if (phase === "hydrating") {
    // Evita flicker SSR/hydration: render mínimo neutro
    return <div className="h-full bg-slate-50" />;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === "welcome" ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.32, ease: EASE_SMOOTH } }}
          className="h-full w-full"
        >
          <WelcomeHero onStart={startApp} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_SMOOTH } }}
          className="h-full"
        >
    <div className="flex h-full bg-slate-50/80 overflow-hidden">

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Loading modal (procesamiento RAG) ── */}
      <LoadingModal open={triajeLoading} />

      {/* ── Puente de redirección segura a sitios oficiales ── */}
      <ExternalLinkBridge />

      {/* ══════════════════════════════════════════════════════════
          FLOATING SIDEBAR
      ══════════════════════════════════════════════════════════ */}
      <aside className={cn(
        "fixed lg:relative z-30 lg:z-auto inset-y-0 left-0 flex flex-col w-[78vw] max-w-[280px] lg:w-60 shrink-0",
        "bg-white/90 backdrop-blur-xl border-r border-slate-200/60",
        "shadow-xl shadow-slate-900/5",
        "transition-transform duration-[280ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* Brand header */}
        <div className="px-4 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🇨🇴</span>
              <p className="text-[9px] text-slate-400 font-bold tracking-[0.14em] uppercase">
                República de Colombia
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden size-6 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <X className="size-3.5 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Shield className="size-4 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-[13.5px] leading-tight tracking-tight">Navegador Social</p>
              <p className="text-[11px] text-blue-500 font-semibold tracking-wide">de Derechos · Colombia</p>
            </div>
          </div>

          {/* Colombian flag stripe */}
          <div className="mt-3 h-[3px] flex rounded-full overflow-hidden gap-px">
            <div className="flex-[2] bg-yellow-400" />
            <div className="flex-[1] bg-blue-500" />
            <div className="flex-[1] bg-red-500" />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin space-y-4">

          {/* Main nav */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 px-2 mb-1.5">
              Pantallas
            </p>
            <LayoutGroup>
              <nav className="space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const active   = screen === item.id;
                  const disabled = item.id === "mapa" && !triajeResult;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { if (!disabled) { setScreen(item.id); setSidebarOpen(false); } }}
                      disabled={disabled}
                      className={cn(
                        "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left",
                        disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer group"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 bg-blue-50 border border-blue-100 rounded-xl"
                          transition={{ type: "spring", stiffness: 400, damping: 34 }}
                        />
                      )}
                      <item.Icon
                        strokeWidth={1.75}
                        className={cn(
                          "relative z-10 size-4 shrink-0 transition-colors",
                          active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <div className="relative z-10 flex-1 min-w-0">
                        <p className={cn(
                          "text-[13px] font-semibold leading-tight tracking-tight transition-colors",
                          active ? "text-blue-700" : "text-slate-700 group-hover:text-slate-900"
                        )}>
                          {item.label}
                        </p>
                        <p className={cn("text-[11px] truncate font-normal", active ? "text-blue-400/80" : "text-slate-400")}>
                          {item.sub}
                        </p>
                      </div>
                      {active && (
                        <span className="relative z-10 size-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </LayoutGroup>
          </div>

          {/* Portales */}
          <div className="pt-1 border-t border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 px-2 mb-1.5">
              Portales oficiales
            </p>
            <div className="space-y-0.5">
              {RECURSOS.slice(0, 7).map((r) => (
                <a
                  key={r.nombre}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <Globe className="size-3 text-slate-300 group-hover:text-slate-400 shrink-0" />
                  <span className="text-[11.5px] text-slate-500 group-hover:text-slate-700 truncate flex-1 transition-colors">
                    {r.nombre}
                  </span>
                  <ExternalLink className="size-2.5 text-slate-200 group-hover:text-blue-400 shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Status footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {apiEstado === "ok"
              ? <Wifi    className="size-3 text-emerald-500" />
              : apiEstado === "error"
              ? <WifiOff className="size-3 text-red-400" />
              : <Loader2 className="size-3 text-amber-400 animate-spin" />
            }
            <span className={cn("text-[11px] font-medium",
              apiEstado === "ok"    ? "text-emerald-600" :
              apiEstado === "error" ? "text-red-500"     : "text-amber-500"
            )}>
              {apiEstado === "ok" ? "Sistema activo" : apiEstado === "error" ? "Sin conexión" : "Conectando…"}
            </span>
            <span className="ml-auto text-[10px] text-slate-300 font-mono">v3.0</span>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Glassmorphism topbar */}
        <header className="shrink-0 h-14 sm:h-12 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="lg:hidden size-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors shrink-0"
          >
            <Menu className="size-4 text-slate-600" />
          </button>

          {/* Breadcrumb nav */}
          <nav className="flex items-center gap-0.5 flex-1 min-w-0">
            {NAV_ITEMS.map((item, i) => (
              <div key={item.id} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="size-3 text-slate-300 mx-0.5 shrink-0" />}
                <button
                  onClick={() => !(item.id === "mapa" && !triajeResult) && setScreen(item.id)}
                  disabled={item.id === "mapa" && !triajeResult}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] tracking-tight font-medium transition-all",
                    screen === item.id
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : item.id === "mapa" && !triajeResult
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  )}
                >
                  <item.Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              </div>
            ))}
          </nav>

          {/* API status pill — compacto en mobile, full label en desktop */}
          <div
            title={apiEstado === "ok" ? "Conectado · Groq LLaMA 3.3" : apiEstado === "error" ? "Sin conexión" : "Conectando…"}
            className={cn(
              "flex items-center gap-1.5 rounded-full border text-[11px] font-semibold shrink-0",
              "size-7 justify-center sm:size-auto sm:justify-start sm:px-2.5 sm:py-1",
              apiEstado === "ok"    ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
              apiEstado === "error" ? "bg-red-50     border-red-200     text-red-700"     :
                                      "bg-amber-50   border-amber-200   text-amber-700"
            )}
          >
            <span className={cn("size-1.5 rounded-full shrink-0",
              apiEstado === "ok"    ? "bg-emerald-500"              :
              apiEstado === "error" ? "bg-red-500"                  :
                                      "bg-amber-400 animate-pulse"
            )} />
            <span className="hidden sm:inline">
              {apiEstado === "ok" ? "Groq · LLaMA 3.3" : apiEstado === "error" ? "Offline" : "…"}
            </span>
          </div>

          {/* Accessibility dropdown */}
          <AccessibilityWidget />
        </header>

        {/* ══ SCREEN AREA ══ */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">

            {/* ── TRIAJE ── */}
            {screen === "triaje" && (
              <motion.div
                key="triaje"
                variants={pageVariants} initial="initial" animate="animate" exit="exit"
                className="absolute inset-0 overflow-y-auto"
              >
                {triajeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[12.5px] text-red-700"
                  >
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{triajeError}</span>
                    <button onClick={() => setTriajeError(null)} className="ml-auto hover:text-red-800 transition-colors">
                      <X className="size-4" />
                    </button>
                  </motion.div>
                )}
                <SocialTriageForm onSubmit={handleTriaje} loading={triajeLoading} />
              </motion.div>
            )}

            {/* ── MAPA ── */}
            {screen === "mapa" && triajeResult && (
              <motion.div
                key="mapa"
                variants={pageVariants} initial="initial" animate="animate" exit="exit"
                className="absolute inset-0 overflow-y-auto"
              >
                <RightsMap
                  result={triajeResult}
                  onReset={() => setScreen("triaje")}
                  onDeepConsult={() => setScreen("consultas")}
                />
              </motion.div>
            )}

            {/* ── CONSULTAS ── */}
            {screen === "consultas" && (
              <motion.div
                key="consultas"
                variants={pageVariants} initial="initial" animate="animate" exit="exit"
                className="absolute inset-0 flex flex-col overflow-hidden"
              >
                {/* Triaje banner */}
                {triajeResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className={cn(
                      "shrink-0 mx-4 mt-3 flex items-center gap-2.5 rounded-xl px-4 py-2.5 border text-[12px]",
                      triajeResult.nivel_riesgo === "ROJO"
                        ? "bg-red-50 border-red-200"
                        : triajeResult.nivel_riesgo === "AMARILLO"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-emerald-50 border-emerald-200"
                    )}
                  >
                    <span>
                      {triajeResult.nivel_riesgo === "ROJO" ? "🔴" :
                       triajeResult.nivel_riesgo === "AMARILLO" ? "🟡" : "🟢"}
                    </span>
                    <span className="text-slate-700 flex-1 min-w-0 truncate">
                      <strong className="hidden sm:inline">Diagnóstico:</strong> {triajeResult.titulo}
                    </span>
                    <button
                      onClick={() => setScreen("mapa")}
                      className="flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 shrink-0 transition-colors min-h-[32px]"
                    >
                      <span className="hidden sm:inline">Ver mapa</span>
                      <span className="sm:hidden">Mapa</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </motion.div>
                )}

                {/* Chat / Bento area */}
                <main className="flex-1 overflow-y-auto scrollbar-thin">
                  {(() => {
                    const hasUserMsg = mensajes.some(m => m.rol === "usuario");
                    if (hasUserMsg) {
                      return <ChatMessages mensajes={mensajes} chatLoading={chatLoading} bottomRef={bottomRef} />;
                    }
                    return (
                      <>
                        <ChatMessages mensajes={mensajes} chatLoading={false} bottomRef={bottomRef} />
                        <BentoGrid onQuestion={enviarChat} />
                      </>
                    );
                  })()}
                </main>

                {/* Magic Command Bar */}
                <MagicCommandBar
                  input={input}
                  setInput={setInput}
                  onSend={enviarChat}
                  loading={chatLoading}
                  textareaRef={textareaRef}
                  resize={resize}
                  focused={inputFocused}
                  setFocused={setInputFocused}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
