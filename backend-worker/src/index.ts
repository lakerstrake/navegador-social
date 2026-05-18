/**
 * Navegador Social de Derechos – Colombia
 * Cloudflare Worker v3.0
 *
 * Endpoints:
 *   GET  /                      → health check
 *   POST /api/v1/triaje-rag     → diagnóstico RAG + mapa de derechos
 *   POST /chat                  → consultas profundas (chat libre)
 */

import KB from "../data/structured_causes.json";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Env {
  GROQ_API_KEY?:      string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?:    string;
}

type Actividad  = "informal" | "cuidador" | "temporal" | "estudiante" | "formal";
type EstadoSalud = "subsidiado" | "beneficiario" | "cotizante" | "sin_afiliacion";
type NivelRiesgo = "ROJO" | "AMARILLO" | "VERDE";

interface TriajeRequest {
  actividad:       Actividad;
  salud:           EstadoSalud;
  ahorro_mensual:  number;
  cuidador:        boolean;
  edad:            number;
}

interface ChatRequest {
  mensaje:   string;
  historial: { rol: string; texto: string }[];
}

// ── CORS helper ────────────────────────────────────────────────────────────────

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = [
    "http://localhost:3000", "http://localhost:3001",
    "http://localhost:4000", "http://localhost:4001",
  ];
  const allowOrigin =
    origin && (allowed.includes(origin) || origin.endsWith(".pages.dev") || origin.endsWith(".workers.dev"))
      ? origin
      : allowed[0];

  return {
    "Access-Control-Allow-Origin":  allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age":       "86400",
  };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// ── RAG scoring (port of rag_service.py) ──────────────────────────────────────

interface Cause {
  id:         string;
  label:      string;
  risk_level: NivelRiesgo;
  risk_score: number;
  triggers:   {
    actividad?:  string[];
    salud?:      string[];
    cuidador?:   boolean;
    ahorro_max?: number;
    ahorro_min?: number;
  };
  description: string;
  impact:      string;
  remedy: {
    descripcion: string;
    paso1: { titulo: string; descripcion: string; accion: string; url: string; icono: string };
    paso2: { titulo: string; descripcion: string; accion: string; url: string; icono: string };
    paso3?: { titulo: string; descripcion: string; accion: string; url: string; icono: string };
  };
  programs: { nombre: string; descripcion: string; url: string; icono: string }[];
  legal_basis: string[];
  alerta:      string;
}

function scoreCause(cause: Cause, data: TriajeRequest): number {
  let score = 0;
  const t = cause.triggers;

  if (t.actividad  && t.actividad.includes(data.actividad))      score += 4;
  if (t.salud      && t.salud.includes(data.salud))              score += 3;
  if (t.cuidador   !== undefined && t.cuidador === data.cuidador) score += 3;

  const s = data.ahorro_mensual;
  if (t.ahorro_max !== undefined && t.ahorro_min === undefined && s <= t.ahorro_max) score += 2;
  else if (t.ahorro_min !== undefined && t.ahorro_max !== undefined &&
           s >= t.ahorro_min && s <= t.ahorro_max)                                  score += 2;

  return score;
}

function retrieveCauses(data: TriajeRequest, topN = 3): Cause[] {
  const causes = KB.causes as Cause[];
  return causes
    .map(c => ({ cause: c, score: scoreCause(c, data) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => x.cause);
}

function computeRiskLevel(causes: Cause[]): NivelRiesgo {
  if (causes.some(c => c.risk_level === "ROJO"))     return "ROJO";
  if (causes.some(c => c.risk_level === "AMARILLO")) return "AMARILLO";
  return "VERDE";
}

function buildContext(causes: Cause[]): string {
  return causes.map((c, i) =>
    `--- CAUSA ${i + 1}: ${c.label} (Riesgo: ${c.risk_level}) ---
Descripción: ${c.description}
Impacto: ${c.impact}
Alerta: ${c.alerta}

Remedio sugerido: ${c.remedy.descripcion}
Paso 1 – ${c.remedy.paso1.titulo}: ${c.remedy.paso1.descripcion}
Paso 2 – ${c.remedy.paso2.titulo}: ${c.remedy.paso2.descripcion}
${c.remedy.paso3 ? `Paso 3 – ${c.remedy.paso3.titulo}: ${c.remedy.paso3.descripcion}` : ""}

Programas: ${c.programs.map(p => p.nombre).join(", ")}
Base legal: ${c.legal_basis.join(", ")}
`).join("\n");
}

// ── Prompts ────────────────────────────────────────────────────────────────────

const RAG_SYSTEM = `Eres el Navegador Social de Derechos de Colombia, un asistente experto en seguridad social, normativa colombiana y servicios del Estado orientado a trabajadores vulnerables y trabajadores sociales del barrio Kennedy y toda Colombia.

Normativa clave: Ley 100/1993 (pensiones y salud), BEPS (Decreto 604/2013), Ley 1438/2011 (salud), Ley 1448/2011 (víctimas), Ley 1098/2006 (infancia), Código Sustantivo del Trabajo, Ley 1010/2006 (acoso laboral), Ley 2040/2020 (cuidado).

URLs OFICIALES — usa EXACTAMENTE estas URLs para cada institución/programa (no inventes URLs):
- SENA formación / cursos: https://oferta.senasofiaplus.edu.co/sofia-oferta/
- SENA virtual (Sena Sofía): https://senasofiaplus.edu.co
- BEPS Colpensiones: https://www.colpensiones.gov.co/pensiones/beps
- Colpensiones afiliación: https://www.colpensiones.gov.co
- Ley del Cuidado / derechos cuidadores (Ley 2040/2020): https://www.mintrabajo.gov.co/empleo-y-pensiones/empleo/trabajo-de-cuidado
- Fondo de Solidaridad Pensional: https://www.fondodesolidaridadpensional.gov.co
- Subsidio de salud Adres (Sisbén/subsidiado): https://www.adres.gov.co
- Portal SENA principal: https://www.sena.edu.co
- MinTrabajo (orientación laboral): https://www.mintrabajo.gov.co
- MinSalud (derechos en salud): https://www.minsalud.gov.co
- ICBF (familia, infancia, cuidado): https://www.icbf.gov.co
- Prosperidad Social (subsidios): https://prosperidadsocial.gov.co
- Defensoría del Pueblo: https://www.defensoria.gov.co
- Portal único del Estado: https://www.gov.co

Responde SIEMPRE en JSON válido con esta estructura exacta:
{
  "nivel_riesgo": "ROJO|AMARILLO|VERDE",
  "titulo": "título empático de máximo 8 palabras",
  "resumen": "resumen de la situación en 2-3 oraciones",
  "causas_identificadas": ["causa 1", "causa 2"],
  "pasos": [
    {"numero": 1, "icono": "emoji", "titulo": "...", "descripcion": "...", "accion": "...", "url": "..."},
    {"numero": 2, "icono": "emoji", "titulo": "...", "descripcion": "...", "accion": "...", "url": "..."},
    {"numero": 3, "icono": "emoji", "titulo": "...", "descripcion": "...", "accion": "...", "url": "..."}
  ],
  "programas": [
    {"nombre": "...", "descripcion": "...", "url": "...", "icono": "emoji"}
  ],
  "dato_clave": "estadística o dato impactante sobre la situación",
  "aviso_legal": "orientación informativa. Para asesoría jurídica personalizada consulta la Defensoría del Pueblo (línea 1500)."
}`;

const CHAT_SYSTEM = `Eres el Navegador Social de Derechos de Colombia, asistente experto en seguridad social, normativa colombiana y servicios del Estado. Ayudas a trabajadores sociales y ciudadanos vulnerables del barrio Kennedy y toda Colombia.

Normativa clave: Ley 100/1993 (pensiones y salud), BEPS (Decreto 604/2013), Ley 1438/2011 (salud), Ley 1448/2011 (víctimas), Ley 1098/2006 (infancia), Código Sustantivo del Trabajo, Ley 1010/2006 (acoso laboral), Ley 2040/2020 (cuidado).

Instituciones: Colpensiones, MinTrabajo, MinSalud, ICBF, Prosperidad Social, UARIV, SENA, Defensoría del Pueblo, Comisarías de Familia.

Responde en español colombiano, claro y empático. Cita la ley cuando aplique. Orienta a la institución competente. Para emergencias, línea 123.`;

// ── LLM caller ─────────────────────────────────────────────────────────────────

type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

async function callGroq(
  messages: LLMMessage[],
  apiKey: string,
  jsonMode = false,
): Promise<string> {
  const body: Record<string, unknown> = {
    model:       "llama-3.3-70b-versatile",
    messages,
    max_tokens:  1400,
    temperature: 0.25,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json() as { choices: [{ message: { content: string } }] };
  return data.choices[0].message.content;
}

async function callAnthropic(
  messages: LLMMessage[],
  apiKey: string,
  systemPrompt: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1400,
      system:     systemPrompt,
      messages:   messages.filter(m => m.role !== "system"),
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
  const data = await res.json() as { content: [{ text: string }] };
  return data.content[0].text;
}

async function callOpenAI(
  messages: LLMMessage[],
  apiKey: string,
  jsonMode = false,
): Promise<string> {
  const body: Record<string, unknown> = {
    model:       "gpt-4o-mini",
    messages,
    max_tokens:  1400,
    temperature: 0.25,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json() as { choices: [{ message: { content: string } }] };
  return data.choices[0].message.content;
}

function getProvider(env: Env): ["groq" | "anthropic" | "openai" | null, string | undefined] {
  if (env.GROQ_API_KEY?.startsWith("gsk_"))        return ["groq",      env.GROQ_API_KEY];
  if (env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")) return ["anthropic", env.ANTHROPIC_API_KEY];
  if (env.OPENAI_API_KEY?.startsWith("sk-"))        return ["openai",    env.OPENAI_API_KEY];
  return [null, undefined];
}

async function callLLM(
  messages: LLMMessage[],
  env: Env,
  systemPrompt: string,
  jsonMode = false,
): Promise<string> {
  const [provider, apiKey] = getProvider(env);
  if (!provider || !apiKey) throw new Error("Sin API key configurada.");

  if (provider === "groq")      return callGroq(messages, apiKey, jsonMode);
  if (provider === "anthropic") return callAnthropic(messages, apiKey, systemPrompt);
  return callOpenAI(messages, apiKey, jsonMode);
}

// ── Triaje RAG handler ─────────────────────────────────────────────────────────

const ACTIVIDAD_LABELS: Record<string, string> = {
  informal:   "Trabajo informal / por días",
  cuidador:   "Cuidador/a no remunerado/a",
  temporal:   "Trabajo temporal / contrato",
  estudiante: "Estudiante",
  formal:     "Empleado/a con contrato formal",
};

const SALUD_LABELS: Record<string, string> = {
  subsidiado:     "Régimen Subsidiado (Sisbén)",
  beneficiario:   "Beneficiario de cotizante",
  cotizante:      "Cotizante Contributivo",
  sin_afiliacion: "Sin afiliación",
};

async function handleTriaje(req: TriajeRequest, env: Env): Promise<unknown> {
  // 1. Retrieve
  const causes     = retrieveCauses(req);
  const riskLevel  = computeRiskLevel(causes);
  const context    = buildContext(causes);

  // 2. Build prompt
  const userPrompt = `SITUACIÓN DEL USUARIO:
- Actividad laboral: ${ACTIVIDAD_LABELS[req.actividad]}
- Estado de salud:   ${SALUD_LABELS[req.salud]}
- Ahorro mensual:    $${req.ahorro_mensual.toLocaleString("es-CO")} COP
- Es cuidador/a:     ${req.cuidador ? "Sí" : "No"}
- Edad:              ${req.edad} años

CONTEXTO DE LA BASE DE CONOCIMIENTO:
${context}

Genera el Mapa de Derechos personalizado para este usuario en JSON. El nivel_riesgo debe ser "${riskLevel}" (calculado localmente). Usa emojis apropiados en los iconos.`;

  // 3. Call LLM
  const messages: LLMMessage[] = [
    { role: "system", content: RAG_SYSTEM },
    { role: "user",   content: userPrompt  },
  ];

  const raw = await callLLM(messages, env, RAG_SYSTEM, true);

  // 4. Parse
  let result: Record<string, unknown>;
  try {
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    result = JSON.parse(clean);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("El LLM no devolvió JSON válido.");
    result = JSON.parse(match[0]);
  }

  // 5. Override risk level (local scoring overrides LLM if it downgrades)
  const PRIORITY: Record<NivelRiesgo, number> = { ROJO: 3, AMARILLO: 2, VERDE: 1 };
  const llmRisk = (result.nivel_riesgo as NivelRiesgo) ?? "VERDE";
  if (PRIORITY[riskLevel] > PRIORITY[llmRisk]) result.nivel_riesgo = riskLevel;

  return result;
}

// ── Chat handler ───────────────────────────────────────────────────────────────

async function handleChat(req: ChatRequest, env: Env): Promise<string> {
  if (!req.mensaje?.trim()) throw new Error("El mensaje no puede estar vacío.");

  const history = req.historial.slice(-8).map(m => ({
    role:    (m.rol === "usuario" ? "user" : "assistant") as "user" | "assistant",
    content: m.texto,
  }));

  const messages: LLMMessage[] = [
    { role: "system", content: CHAT_SYSTEM },
    ...history,
    { role: "user",   content: req.mensaje  },
  ];

  return callLLM(messages, env, CHAT_SYSTEM, false);
}

// ── Main fetch handler ─────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/$/, "") || "/";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ── GET / ─────────────────────────────────────────────────────────────────
    if (request.method === "GET" && (path === "/" || path === "")) {
      const [provider] = getProvider(env);
      return json({
        status:    "ok",
        version:   "3.0.0",
        runtime:   "cloudflare-worker",
        llm:       provider ?? "no configurado",
        endpoints: ["/api/v1/triaje-rag", "/chat"],
      }, 200, origin);
    }

    // ── POST /api/v1/triaje-rag ───────────────────────────────────────────────
    if (request.method === "POST" && path === "/api/v1/triaje-rag") {
      try {
        const body = await request.json() as TriajeRequest;

        // Validate
        const actividadesValidas = ["informal","cuidador","temporal","estudiante","formal"];
        const saludValidas       = ["subsidiado","beneficiario","cotizante","sin_afiliacion"];
        if (!actividadesValidas.includes(body.actividad)) {
          return json({ detail: "actividad inválida" }, 422, origin);
        }
        if (!saludValidas.includes(body.salud)) {
          return json({ detail: "salud inválida" }, 422, origin);
        }
        body.ahorro_mensual = Math.max(0, Math.min(1_500_000, Number(body.ahorro_mensual) || 0));
        body.edad           = Math.max(14, Math.min(80,        Number(body.edad)           || 25));
        body.cuidador       = Boolean(body.cuidador);

        const result = await handleTriaje(body, env);
        return json(result, 200, origin);

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno";
        return json({ detail: msg }, 500, origin);
      }
    }

    // ── POST /chat ────────────────────────────────────────────────────────────
    if (request.method === "POST" && path === "/chat") {
      try {
        const body     = await request.json() as ChatRequest;
        const [prov]   = getProvider(env);
        const respuesta = await handleChat(body, env);
        return json({ respuesta, proveedor: prov }, 200, origin);

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno";
        const status = msg.includes("vacío") ? 422 : 500;
        return json({ detail: msg }, status, origin);
      }
    }

    return json({ detail: "Not found" }, 404, origin);
  },
} satisfies ExportedHandler<Env>;
