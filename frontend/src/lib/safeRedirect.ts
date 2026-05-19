// Lista blanca de dominios institucionales colombianos.
// Solo URLs https:// que apunten a estos dominios (o subdominios) pueden ser redirigidas.
const TRUSTED_SUFFIXES = [
  "gov.co",
  "edu.co",
];

const TRUSTED_HOSTS = new Set<string>([
  "www.colpensiones.gov.co",
  "www.beps.gov.co",
  "www.mintrabajo.gov.co",
  "www.minsalud.gov.co",
  "www.icbf.gov.co",
  "www.serviciodeempleo.gov.co",
  "www.defensoria.gov.co",
  "www.unidadvictimas.gov.co",
  "prosperidadsocial.gov.co",
  "www.adres.gov.co",
  "www.fondodesolidaridadpensional.gov.co",
  "www.sena.edu.co",
  "betowa.sena.edu.co",
  "oferta.senasofiaplus.edu.co",
  "senasofiaplus.edu.co",
  "www.gov.co",
]);

export interface SafeUrl {
  raw: string;
  hostname: string;
  pretty: string;
}

export function classifyUrl(url: string): SafeUrl | null {
  if (typeof url !== "string" || !url.startsWith("https://")) return null;
  try {
    const u = new URL(url);
    const ok =
      TRUSTED_HOSTS.has(u.hostname) ||
      TRUSTED_SUFFIXES.some(s => u.hostname === s || u.hostname.endsWith("." + s));
    if (!ok) return null;
    return {
      raw: url,
      hostname: u.hostname,
      pretty: u.hostname.replace(/^www\./, ""),
    };
  } catch {
    return null;
  }
}

export function isTrusted(url: string): boolean {
  return classifyUrl(url) !== null;
}
