import console from 'node:console';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

// Verifica los pares de color de docs/mvp/diseno-visual.md contra WCAG 2.1 AA.
// Lee las variables de :root de public/css/app.css; no recibe argumentos.
const CSS = fileURLToPath(new URL('../public/css/app.css', import.meta.url));

// [primer plano, fondo, mínimo, uso]. 4,5 para texto normal; 3 para controles y foco (1.4.11).
const PAIRS = [
  ['texto', 'fondo', 4.5, 'texto sobre el fondo de página'],
  ['texto', 'superficie', 4.5, 'texto sobre tarjetas, cabecera y campos'],
  ['texto', 'superficie-suave', 4.5, 'texto sobre superficie alterna'],
  ['texto-suave', 'fondo', 4.5, 'texto secundario sobre el fondo'],
  ['texto-suave', 'superficie', 4.5, 'texto secundario sobre superficie (etiquetas de oferta)'],
  ['texto-suave', 'superficie-suave', 4.5, 'texto secundario en botón desactivado'],
  ['primario', 'fondo', 4.5, 'enlaces sobre el fondo'],
  ['primario', 'superficie', 4.5, 'enlaces y botón secundario sobre blanco'],
  ['primario-hover', 'superficie-suave', 4.5, 'botón secundario con el puntero encima'],
  ['sobre-primario', 'primario', 4.5, 'texto del botón principal'],
  ['sobre-primario', 'primario-hover', 4.5, 'texto del botón principal con el puntero encima'],
  ['acento', 'superficie', 4.5, 'fecha de la oferta sobre tarjeta'],
  ['acento', 'fondo', 4.5, 'fecha sobre el fondo de página'],
  ['error', 'error-fondo', 4.5, 'mensaje de error'],
  ['error', 'fondo', 4.5, 'error de campo sobre el fondo'],
  ['error', 'superficie', 4.5, 'asterisco y error sobre blanco'],
  ['exito', 'exito-fondo', 4.5, 'mensaje de éxito'],
  ['aviso', 'aviso-fondo', 4.5, 'mensaje de aviso'],
  ['sobre-primario', 'error-hover', 4.5, 'botón de peligro con el puntero encima'],
  ['sobre-primario', 'error', 4.5, 'texto del botón de peligro'],
  ['sobre-primario', 'acento', 4.5, 'texto de la insignia de mensajes nuevos'],
  ['borde-campo', 'superficie', 3, 'borde de campo sobre su relleno blanco'],
  ['borde-campo', 'fondo', 3, 'borde del estado vacío sobre el fondo'],
  ['foco', 'fondo', 3, 'anillo de foco sobre el fondo'],
  ['foco', 'superficie', 3, 'anillo de foco sobre blanco'],
  ['foco', 'superficie-suave', 3, 'anillo de foco sobre superficie alterna'],
  // No se mide foco contra primario: el anillo se dibuja a 3 px del control (outline-offset),
  // así que toca solo la superficie que rodea al botón, que es lo que miden las tres filas anteriores.
];

function readVariables(css) {
  const root = /:root\s*\{([^}]*)\}/.exec(css);
  if (!root) throw new Error(':root no encontrado en app.css');
  const vars = new Map();
  for (const match of root[1].matchAll(/--tc-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    vars.set(match[1], match[2].toLowerCase());
  }
  return vars;
}

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function resolve(vars, name) {
  if (name.startsWith('#')) return name;
  const hex = vars.get(name);
  if (!hex) throw new Error(`Variable --tc-${name} no definida en :root`);
  return hex;
}

function run() {
  const vars = readVariables(readFileSync(CSS, 'utf8'));
  let failures = 0;
  for (const [fg, bg, min, use] of PAIRS) {
    const value = ratio(resolve(vars, fg), resolve(vars, bg));
    const ok = value >= min;
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK  ' : 'FALLA'} ${value.toFixed(2).padStart(5)}:1 (mín. ${min}) ${fg} sobre ${bg} — ${use}`);
  }
  console.log(`${PAIRS.length - failures} de ${PAIRS.length} pares cumplen.`);
  if (failures > 0) process.exitCode = 1;
}

try {
  run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
