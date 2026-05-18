const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

// ── Tipos de entrada ──────────────────────────────────────────────────────────
export type Actividad = "informal" | "cuidador" | "temporal" | "estudiante" | "formal";
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
    color:       "text-red-600",
    bg:          "bg-red-50",
    border:      "border-red-200",
    text:        "text-red-700",
    label:       "Alta Vulnerabilidad",
    emoji:       "🔴",
    description: "Requiere acción inmediata",
  },
  AMARILLO: {
    color:       "text-amber-600",
    bg:          "bg-amber-50",
    border:      "border-amber-200",
    text:        "text-amber-700",
    label:       "Vulnerabilidad Media",
    emoji:       "🟡",
    description: "Hay pasos concretos que puedes tomar",
  },
  VERDE: {
    color:       "text-emerald-600",
    bg:          "bg-emerald-50",
    border:      "border-emerald-200",
    text:        "text-emerald-700",
    label:       "Situación Protegida",
    emoji:       "🟢",
    description: "Estás en la ruta correcta",
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
