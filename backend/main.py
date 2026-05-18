from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from pathlib import Path
from typing import Literal
import os, json

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

app = FastAPI(
    title="Navegador Social de Derechos – Colombia",
    description="Motor RAG para diagnóstico de vulnerabilidad previsional de jóvenes",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://localhost:3001",
        "http://localhost:4000", "http://localhost:4001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prompt chat general (pantalla de consultas profundas) ─────────────────────
CHAT_SYSTEM_PROMPT = """Eres el Navegador Social de Derechos de Colombia, asistente experto en \
seguridad social, normativa colombiana y servicios del Estado. Ayudas a trabajadores sociales y \
ciudadanos vulnerables del barrio Kennedy y toda Colombia.

Normativa clave: Ley 100/1993 (pensiones y salud), BEPS (Decreto 604/2013), Ley 1438/2011 \
(salud), Ley 1448/2011 (víctimas), Ley 1098/2006 (infancia), Código Sustantivo del Trabajo, \
Ley 1010/2006 (acoso laboral), Ley 2040/2020 (cuidado).

Instituciones: Colpensiones, MinTrabajo, MinSalud, ICBF, Prosperidad Social, UARIV, SENA, \
Defensoría del Pueblo, Comisarías de Familia.

Responde en español colombiano, claro y empático. Cita la ley cuando aplique. \
Orienta a la institución competente. Para emergencias, línea 123."""


# ═════════════════════════════════════════════════════════════════════════════
# MODELOS
# ═════════════════════════════════════════════════════════════════════════════

class TriajeRequest(BaseModel):
    actividad: Literal["informal", "cuidador", "temporal", "estudiante", "formal"]
    salud: Literal["subsidiado", "beneficiario", "cotizante", "sin_afiliacion"]
    ahorro_mensual: int = Field(ge=0, le=1_500_000)
    cuidador: bool = False
    edad: int = Field(default=25, ge=14, le=80)

class ChatRequest(BaseModel):
    mensaje: str
    historial: list[dict] = []

class ChatResponse(BaseModel):
    respuesta: str
    proveedor: str


# ═════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═════════════════════════════════════════════════════════════════════════════

PROVIDERS = [
    ("groq",      "GROQ_API_KEY",      "gsk_"),
    ("anthropic", "ANTHROPIC_API_KEY", "sk-ant-"),
    ("openai",    "OPENAI_API_KEY",    "sk-"),
]

def get_provider():
    for name, env_var, prefix in PROVIDERS:
        key = os.getenv(env_var, "")
        if key and key.startswith(prefix):
            return name, key
    return None, None


# ═════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/")
def health():
    provider, _ = get_provider()
    return {
        "status": "ok",
        "version": "3.0.0",
        "llm": provider or "no configurado",
        "endpoints": ["/api/v1/triaje-rag", "/chat", "/docs"],
    }


@app.post("/api/v1/triaje-rag")
async def triaje_rag(body: TriajeRequest):
    """
    Motor RAG principal: recibe el diagnóstico del formulario de triaje y
    devuelve el Mapa de Derechos personalizado con semaforización de riesgo.
    """
    _, api_key = get_provider()
    if api_key is None:
        raise HTTPException(503, detail="Sin API key configurada. Agrega GROQ_API_KEY en backend/.env")

    from services.rag_service import run_triaje

    triage_data = body.model_dump()
    try:
        result = run_triaje(triage_data)
    except json.JSONDecodeError as e:
        raise HTTPException(500, detail=f"Error al parsear respuesta del LLM: {e}")
    except Exception as e:
        raise HTTPException(500, detail=str(e))

    return result


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """Chat de consultas profundas (pantalla secundaria)."""
    if not body.mensaje.strip():
        raise HTTPException(422, detail="El mensaje no puede estar vacío.")

    provider, api_key = get_provider()
    if provider is None:
        raise HTTPException(503, detail="Sin API key configurada.")

    messages = [
        {"role": "user" if m["rol"] == "usuario" else "assistant", "content": m["texto"]}
        for m in body.historial[-8:]
        if m.get("rol") in ("usuario", "asistente")
    ]
    messages.append({"role": "user", "content": body.mensaje})

    if provider == "groq":
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": CHAT_SYSTEM_PROMPT}] + messages,
            max_tokens=1200, temperature=0.3,
        )
        respuesta = resp.choices[0].message.content or ""

    elif provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001", max_tokens=1200,
            system=CHAT_SYSTEM_PROMPT, messages=messages,
        )
        respuesta = msg.content[0].text

    else:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": CHAT_SYSTEM_PROMPT}] + messages,
            max_tokens=1200, temperature=0.3,
        )
        respuesta = resp.choices[0].message.content or ""

    return ChatResponse(respuesta=respuesta, proveedor=provider)
