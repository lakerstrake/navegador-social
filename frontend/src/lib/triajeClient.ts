const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

// ── Tipos de entrada ──────────────────────────────────────────────────────────
export type Actividad = "informal" | "cuidador" | "temporal" | "estudiante" | "formal" | "nini";
export type EstadoSalud = "subsidiado" | "beneficiario" | "cotizante" | "sin_afiliacion";

export interface TriajeRequest {
  actividad: Actividad;
  salud: EstadoSalud;
  ahorro_mensual: number;
  cuidador: boolean;
  edad: number;
}

// ── Tipos de respuesta ────────────────────────────────────────────────────────
export type NivelRiesgo = "ROJO" | "AMARILLO" | "VERDE";

export interface PasoAccion {
  numero: number;
  icono: string;
  titulo: string;
  descripcion: string;
  accion: string;
  url?: string;
}

export interface ProgramaRecomendado {
  nombre: string;
  descripcion: string;
  url: string;
  icono: string;
}

export interface TriajeResult {
  nivel_riesgo: NivelRiesgo;
  titulo: string;
  resumen: string;
  causas_identificadas: string[];
  pasos: PasoAccion[];
  programas: ProgramaRecomendado[];
  dato_clave: string;
  aviso_legal: string;
}

// ── Labels descriptivos ───────────────────────────────────────────────────────
export const ACTIVIDAD_LABELS: Record<Actividad, string> = {
  informal:   "Trabajo informal / por días",
  cuidador:   "Cuidador/a no remunerado/a",
  temporal:   "Trabajo temporal / contrato",
  estudiante: "Estudiante",
  formal:     "Empleado/a con contrato formal",
  nini:       "NINI / Sin actividad",
};

export const SALUD_LABELS: Record<EstadoSalud, string> = {
  subsidiado:    "Régimen Subsidiado (Sisbén)",
  beneficiario:  "Beneficiario de cotizante",
  cotizante:     "Cotizante Contributivo",
  sin_afiliacion:"Sin afiliación",
};

export const RIESGO_CONFIG: Record<NivelRiesgo, {
  color: string; bg: string; border: string; text: string;
  label: string; emoji: string; description: string;
}> = {
  ROJO: {
    color:       "text-indigo-700",
    bg:          "bg-indigo-50",
    border:      "border-indigo-200",
    text:        "text-indigo-900",
    label:       "Ruta Prioritaria",
    emoji:       "🧭",
    description: "Tienes varias oportunidades para fortalecer tu protección",
  },
  AMARILLO: {
    color:       "text-amber-700",
    bg:          "bg-amber-50",
    border:      "border-amber-200",
    text:        "text-amber-900",
    label:       "Ruta de Crecimiento",
    emoji:       "🌱",
    description: "Pasos claros para fortalecer tu seguridad social",
  },
  VERDE: {
    color:       "text-emerald-700",
    bg:          "bg-emerald-50",
    border:      "border-emerald-200",
    text:        "text-emerald-900",
    label:       "Protección Sólida",
    emoji:       "🛡️",
    description: "Vas por el camino correcto",
  },
};

// ── Función principal ─────────────────────────────────────────────────────────
export async function runTriaje(data: TriajeRequest): Promise<TriajeResult> {
  const res = await fetch(`${API_URL}/api/v1/triaje-rag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail ?? `Error ${res.status}`);
  }

  return json as TriajeResult;
}

// ── Chat de consultas profundas ───────────────────────────────────────────────
export async function sendChat(
  mensaje: string,
  historial: { rol: string; texto: string }[]
): Promise<string> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje, historial }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail ?? `Error ${res.status}`);
  }

  return json.respuesta as string;
}
