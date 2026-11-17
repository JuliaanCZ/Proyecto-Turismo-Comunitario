import { URL } from 'node:url';

const FALLBACK = '/panel';
const MAX_LENGTH = 2048;
// Base solo para resolver rutas relativas cuando el llamador no pasa APP_ORIGIN.
const DEFAULT_ORIGIN = 'http://localhost';

/**
 * Regla `safeNext` (C-HTTP): una redirección posterior al ingreso solo puede ir
 * a una ruta interna que empiece por `/panel`. Cualquier otra cosa devuelve `/panel`.
 *
 * Se rechaza antes de interpretar (no es cadena, es larga, no empieza por `/`,
 * contiene `//`, `\` o caracteres de control) y se confirma después con `URL`
 * que el origen no cambió y que, ya normalizada (`/panel/../x` → `/x`), la ruta
 * sigue dentro de `/panel`.
 */
export function safeNext(raw, appOrigin = DEFAULT_ORIGIN) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) return FALLBACK;
  if (!raw.startsWith('/') || raw.includes('//') || raw.includes('\\')) return FALLBACK;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return FALLBACK;

  let url;
  try {
    url = new URL(raw, appOrigin);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== new URL(appOrigin).origin) return FALLBACK;
  if (url.pathname !== '/panel' && !url.pathname.startsWith('/panel/')) return FALLBACK;
  return `${url.pathname}${url.search}`;
}
