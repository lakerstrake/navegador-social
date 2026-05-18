"""
Motor RAG (Retrieval-Augmented Generation) para diagnóstico de vulnerabilidad previsional.
Recuperación determinista por scoring + síntesis empática vía LLM.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

DATA_PATH = Path(__file__).parent.parent / "data" / "structured_causes.json"

# ── Carga en memoria (singleton) ──────────────────────────────────────────────
_knowledge_base: dict[str, Any] | None = None


def _load_kb() -> dict[str, Any]:
    global _knowledge_base
    if _knowledge_base is None:
        with open(DATA_PATH, encoding="utf-8") as f:
            _knowledge_base = json.load(f)
    return _knowledge_base


# ── Scoring determinista ──────────────────────────────────────────────────────
def _score_cause(cause: dict, data: dict) -> int:
    score = 0
    triggers = cause.get("triggers", {})

    actividad = data.get("actividad", "")
    salud = data.get("salud", "")
    ahorro = int(data.get("ahorro_mensual", 0))
    cuidador = bool(data.get("cuidador", False))

    if actividad in triggers.get("actividad", []):
        score += 4

    if salud in triggers.get("salud", []):
        score += 3

    if cuidador and triggers.get("cuidador", False):
        score += 3

    ahorro_max = triggers.get("ahorro_max")
    ahorro_min = triggers.get("ahorro_min", 0)
    if ahorro_max is not None and ahorro_min <= ahorro <= ahorro_max:
        score += 2

    return score


def retrieve_causes(triage_data: dict, top_n: int = 3) -> list[dict]:
    """Recupera las causas más relevantes según el perfil del usuario."""
    kb = _load_kb()
    scored = [
        (cause, _score_cause(cause, triage_data))
        for cause in kb["causes"]
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [c for c, s in scored[:top_n] if s > 0] or [scored[0][0]]


def build_context(causes: list[dict]) -> str:
    """Construye el contexto estructurado para el LLM."""
    parts = []
    for c in causes:
        r = c["remedy"]
        steps = [r.get(f"paso{i}") for i in range(1, 4) if r.get(f"paso{i}")]
        step_text = "\n".join(
            f"  PASO {i+1}: {s['titulo']} – {s['descripcion']}"
            for i, s in enumerate(steps)
        )
        programs = ", ".join(p["nombre"] for p in c.get("programs", []))
        laws = ", ".join(c.get("legal_basis", []))
        parts.append(
            f"CAUSA: {c['description']}\n"
            f"IMPACTO: {c['impact']}\n"
            f"NIVEL DE RIESGO: {c['risk_level']}\n"
            f"REMEDIO BASE: {r['descripcion']}\n"
            f"PASOS:\n{step_text}\n"
            f"PROGRAMAS: {programs}\n"
            f"BASE LEGAL: {laws}\n"
            f"ALERTA: {c.get('alerta', '')}"
        )
    return "\n\n---\n\n".join(parts)


# ── Nivel de riesgo consolidado ───────────────────────────────────────────────
def compute_risk_level(causes: list[dict]) -> str:
    levels = [c["risk_level"] for c in causes]
    if "ROJO" in levels:
        return "ROJO"
    if "AMARILLO" in levels:
        return "AMARILLO"
    return "VERDE"


# ── Prompt del sistema RAG ────────────────────────────────────────────────────
RAG_SYSTEM_PROMPT = """Actúa como un Trabajador Social empático y Asesor Legal experto en seguridad social colombiana. \
Tu objetivo es reducir la fricción y democratizar el acceso a derechos de jóvenes vulnerables del barrio Kennedy en Bogotá.

INSTRUCCIONES CRÍTICAS:
- Responde ÚNICAMENTE basándote en el contexto estructurado proporcionado. No inventes leyes ni programas.
- Si el usuario no tiene ingresos obligados a pensión, NO le digas "debes pagar". Trázale la ruta BEPS o régimen subsidiado.
- Usa lenguaje claro, empático y sin jerga burocrática.
- El tono debe ser como el de un amigo que sabe de leyes: cercano pero preciso.
- SIEMPRE incluye exactamente 3 pasos accionables con URLs reales de gov.co.
- El nivel de riesgo DEBE ser exactamente: ROJO, AMARILLO o VERDE (en mayúsculas).
- Responde EXCLUSIVAMENTE en JSON válido con la estructura indicada. Sin texto adicional fuera del JSON."""

RAG_USER_TEMPLATE = """SITUACIÓN DEL USUARIO:
- Actividad principal: {actividad_label}
- Estado de salud/afiliación: {salud_label}
- Capacidad de ahorro mensual: ${ahorro_mensual:,} COP
- Realiza trabajo de cuidado no remunerado: {cuidador_label}
- Edad aproximada: {edad} años

CONTEXTO DE LA BASE DE CONOCIMIENTO:
{context}

Genera una respuesta diagnóstica en el siguiente formato JSON exacto:
{{
  "nivel_riesgo": "ROJO|AMARILLO|VERDE",
  "titulo": "Título empático de máx 8 palabras",
  "resumen": "2-3 frases empáticas que explican la situación y la esperanza",
  "causas_identificadas": ["id_causa_1", "id_causa_2"],
  "pasos": [
    {{
      "numero": 1,
      "icono": "emoji",
      "titulo": "Título del paso",
      "descripcion": "Descripción concreta de qué hacer y por qué",
      "accion": "Texto del botón de acción",
      "url": "https://url.gov.co"
    }}
  ],
  "programas": [
    {{
      "nombre": "Nombre del programa",
      "descripcion": "Descripción breve",
      "url": "https://url.gov.co",
      "icono": "emoji"
    }}
  ],
  "dato_clave": "Un dato estadístico o legal impactante relacionado con la situación",
  "aviso_legal": "Orientación informativa basada en normativa colombiana vigente. Para asesoría jurídica personalizada, consulta la Defensoría del Pueblo (línea 1500) o un consultorio jurídico universitario."
}}"""


ACTIVIDAD_LABELS = {
    "informal": "Trabajo informal / por días",
    "cuidador": "Cuidador/a no remunerado/a",
    "temporal": "Trabajo temporal / por contrato",
    "estudiante": "Estudiante",
    "formal": "Empleado/a con contrato formal",
}

SALUD_LABELS = {
    "subsidiado": "Régimen Subsidiado (Sisbén)",
    "beneficiario": "Beneficiario de cotizante (familiar)",
    "cotizante": "Cotizante Contributivo",
    "sin_afiliacion": "Sin afiliación al sistema",
}


def build_prompt(triage_data: dict, context: str) -> str:
    return RAG_USER_TEMPLATE.format(
        actividad_label=ACTIVIDAD_LABELS.get(triage_data.get("actividad", ""), "No especificado"),
        salud_label=SALUD_LABELS.get(triage_data.get("salud", ""), "No especificado"),
        ahorro_mensual=int(triage_data.get("ahorro_mensual", 0)),
        cuidador_label="Sí" if triage_data.get("cuidador") else "No",
        edad=triage_data.get("edad", 25),
        context=context,
    )


def call_llm(prompt: str) -> str:
    """Llama al LLM disponible (Groq > Anthropic > OpenAI)."""
    groq_key = os.getenv("GROQ_API_KEY", "")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")

    if groq_key and groq_key.startswith("gsk_"):
        from openai import OpenAI
        client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1800,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content or "{}"

    if anthropic_key and anthropic_key.startswith("sk-ant-"):
        import anthropic
        client = anthropic.Anthropic(api_key=anthropic_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1800,
            system=RAG_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text

    if openai_key and openai_key.startswith("sk-"):
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1800,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content or "{}"

    raise RuntimeError("No hay API key configurada (GROQ_API_KEY, ANTHROPIC_API_KEY u OPENAI_API_KEY)")


def run_triaje(triage_data: dict) -> dict:
    """Pipeline completo: retrieval → context → LLM → parse."""
    causes = retrieve_causes(triage_data)
    context = build_context(causes)
    prompt = build_prompt(triage_data, context)
    raw = call_llm(prompt)

    # Parse JSON (puede venir con ```json ... ```)
    import re
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        raw = match.group(0)

    result = json.loads(raw)

    # Garantizamos nivel de riesgo coherente con el scoring local
    local_level = compute_risk_level(causes)
    llm_level = result.get("nivel_riesgo", "AMARILLO").upper()
    # Si el LLM baja el riesgo pero localmente es ROJO, preservamos ROJO
    priority = {"ROJO": 2, "AMARILLO": 1, "VERDE": 0}
    if priority.get(local_level, 0) > priority.get(llm_level, 0):
        result["nivel_riesgo"] = local_level

    return result
