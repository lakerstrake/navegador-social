"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, Sparkles, Lock, GraduationCap } from "lucide-react";

interface Step {
  emoji: string;
  title: string;
  desc:  string;
}

const STEPS: Step[] = [
  {
    emoji: "👤",
    title: "Cuéntanos tu realidad",
    desc:  "Responde 3 preguntas simples sin dar datos personales.",
  },
  {
    emoji: "🧠",
    title: "Análisis inteligente",
    desc:  "Nuestra IA cruza tu perfil con la Ley y los programas del Estado.",
  },
  {
    emoji: "🗺️",
    title: "Tu ruta clara",
    desc:  "Recibe enlaces oficiales y pasos exactos para actuar hoy.",
  },
];

const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const container: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const item: Variants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const cardItem: Variants = {
  hidden:  { opacity: 0, y: 14, scale: 0.98 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.42, ease: EASE } },
};

export default function WelcomeHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen h-full w-full flex items-center justify-center px-4 py-8 sm:py-10 relative overflow-hidden bg-slate-50">
      {/* ── Mesh gradient institucional sutil ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(at 18% 22%, rgba(99,102,241,0.12) 0%, transparent 55%),
            radial-gradient(at 82% 16%, rgba(16,185,129,0.08) 0%, transparent 60%),
            radial-gradient(at 50% 92%, rgba(99,102,241,0.07) 0%, transparent 60%)
          `,
        }}
      />

      {/* Bandera colombiana sutil al borde superior */}
      <div aria-hidden="true" className="absolute top-0 inset-x-0 h-[3px] flex">
        <div className="flex-[2] bg-yellow-400/80" />
        <div className="flex-[1] bg-blue-500/80" />
        <div className="flex-[1] bg-red-500/80" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative max-w-3xl w-full mx-auto text-center flex flex-col items-center gap-5 sm:gap-6"
      >
        {/* Eyebrow */}
        <motion.div
          variants={item}
          className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-indigo-200 text-indigo-700 text-[11.5px] font-semibold px-3 py-1.5 rounded-full shadow-sm"
        >
          <Sparkles className="size-3 text-indigo-600" strokeWidth={2.25} aria-hidden="true" />
          <span>Tu brújula para los derechos sociales en Colombia</span>
        </motion.div>

        {/* Título */}
        <motion.h1
          variants={item}
          className="text-[26px] sm:text-[40px] lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-[1.08] max-w-2xl"
        >
          Trámites, derechos y oportunidades,
          <br className="hidden sm:block" />
          <span className="text-indigo-700"> sin lenguaje complicado.</span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          variants={item}
          className="text-[14px] sm:text-[16px] text-slate-700 max-w-xl leading-relaxed font-normal"
        >
          Descubre a qué <strong className="font-semibold text-slate-900">subsidios</strong>, <strong className="font-semibold text-slate-900">programas de educación</strong> o <strong className="font-semibold text-slate-900">beneficios pensionales</strong> tienes derecho, en menos de 1 minuto.
        </motion.p>

        {/* Grid de 3 pasos */}
        <motion.div
          variants={item}
          className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mt-1"
        >
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              variants={cardItem}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.18 }}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-shadow flex flex-row sm:flex-col items-start text-left gap-3 sm:gap-2.5"
            >
              <span
                className="size-10 sm:size-11 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center justify-center text-[20px] sm:text-[22px] shrink-0"
                aria-hidden="true"
              >
                {s.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13.5px] sm:text-[14px] font-bold text-slate-900 tracking-tight leading-tight">
                  {s.title}
                </h3>
                <p className="text-[12px] sm:text-[12.5px] text-slate-600 leading-relaxed font-medium mt-1">
                  {s.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={item}
          className="w-full max-w-sm mt-1 flex flex-col items-center gap-2.5"
        >
          <motion.button
            type="button"
            onClick={onStart}
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
            className="w-full min-h-[56px] rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-bold text-[15px] tracking-tight shadow-xl shadow-indigo-900/25 hover:from-indigo-500 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2.5 text-center cursor-pointer"
          >
            <span>Iniciar mi diagnóstico gratuito</span>
            <motion.span
              variants={{ hover: { x: 5 } }}
              transition={{ duration: 0.2, ease: EASE }}
              className="inline-flex pointer-events-none"
            >
              <ArrowRight className="size-5" strokeWidth={2.25} aria-hidden="true" />
            </motion.span>
          </motion.button>

          {/* Microcopy de confianza */}
          <p className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-600 font-medium">
            <Lock className="size-3 text-emerald-600" strokeWidth={2.5} aria-hidden="true" />
            <span>100% privado y anónimo · Ley 1581 de 2012</span>
          </p>
        </motion.div>

        {/* Atribución académica */}
        <motion.div
          variants={item}
          className="mt-4 flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-full px-3.5 py-1.5 shadow-sm"
        >
          <GraduationCap className="size-3.5 text-indigo-600 shrink-0" strokeWidth={2} aria-hidden="true" />
          <p className="text-[11px] text-slate-700 font-medium leading-tight">
            Proyecto académico de{" "}
            <span className="font-bold text-slate-900">Sarai Yireth Corredor Miranda</span>{" "}
            <span className="text-slate-400">·</span>{" "}
            <span className="text-emerald-700 font-semibold">Trabajadora Social</span>{" "}
            <span className="text-slate-400">·</span>{" "}
            <span className="text-indigo-700 font-semibold">Universidad de La Salle</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
