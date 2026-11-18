// B3.3: comprueba que los enlaces relativos de los documentos de B3.3 apuntan a archivos que existen
// (diagramas de B3.1, matriz de B3.2, despliegue de B1.11, evidencias). No visita enlaces externos.
// Uso, desde la raíz: node docs/mvp/evidencias/B3.3/comprobar-enlaces.mjs
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import console from 'node:console';
import process from 'node:process';

const DOCS = [
  'README.md',
  'docs/mvp/ia.md',
  'docs/mvp/pruebas.md',
  'docs/mvp/evidencias/B3.3/LEEME.md',
  'docs/mvp/evidencias/B3.3/autoria.md',
  'docs/mvp/evidencias/B3.3/secretos.md',
  'docs/mvp/evidencias/B3.3/contenido-heredado.md',
  'docs/mvp/evidencias/B3.3/tm-ent-01-registro.md',
];

let total = 0;
let missing = 0;
for (const doc of DOCS) {
  const text = readFileSync(doc, 'utf8');
  const links = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  for (const raw of links) {
    if (/^(https?:|mailto:|#)/.test(raw)) continue;
    const [path, anchor] = raw.split('#');
    if (!path) continue;
    const target = normalize(join(dirname(doc), decodeURIComponent(path)));
    total += 1;
    const ok = existsSync(target);
    if (!ok) missing += 1;
    if (!ok) console.log(`FALTA  ${doc} -> ${raw}`);
    else if (anchor && target.endsWith('.md')) {
      // Anclas: se verifica que exista un encabezado con ese texto (aproximado a la regla de GitHub).
      const slugs = [...readFileSync(target, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1].toLowerCase()
        .replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-'));
      if (!slugs.includes(anchor.toLowerCase())) {
        missing += 1;
        console.log(`ANCLA? ${doc} -> ${raw}`);
      }
    }
  }
}
console.log(`Enlaces relativos revisados: ${total}. Sin resolver: ${missing}.`);
process.exitCode = missing === 0 ? 0 : 1;
