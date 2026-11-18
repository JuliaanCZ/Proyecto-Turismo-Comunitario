// TM-ENT-02 (B3.3): busca patrones de credenciales y datos personales en el árbol y en el historial.
//
// Nunca imprime el valor encontrado: solo el tipo, el archivo, la línea y, en el historial, el commit.
// Uso (desde la raíz del repositorio):
//   node docs/mvp/evidencias/B3.3/buscar-secretos.mjs arbol
//   node docs/mvp/evidencias/B3.3/buscar-secretos.mjs historial
//   node docs/mvp/evidencias/B3.3/buscar-secretos.mjs env-local   (compara valores de TU .env con árbol e historial;
//                                                                   imprime solo el nombre de la variable y si coincide)
// Código de salida: 0 sin hallazgos que exijan decisión; 1 con hallazgos de tipo «posible secreto real»; 2 por uso.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import console from 'node:console';

const SKIP_EXT = /\.(png|jpe?g|gif|webp|ico|woff2?|sqlite3?|db|zip)$/i;
const SKIP_PATH = /(^|\/)(package-lock\.json|node_modules\/)/;
const SAFE_VALUE = /ejemplo|fictici|demo|example|changeme|dummy|test|prueba|marcador|placeholder|secret-ficticio|x{4,}|<[^>]+>|\$\{|process\.env|config\.|env\.|^\.{3}$/i;
const SAFE_EMAIL_DOMAIN = /(^|\.)(demo\.test|test\.local|example\.(com|org|net)|ejemplo\.(com|org)|localhost|test|invalid|local)$|users\.noreply\.github\.com$|^(anthropic|cursor)\.com$/i;

// tipo -> [expresión, ¿posible secreto real?]
const PATTERNS = [
  ['clave-privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/, true],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/, true],
  ['token-github', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|github_pat_[A-Za-z0-9_]{50,}/, true],
  ['token-slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}/, true],
  ['clave-api-google', /\bAIza[0-9A-Za-z_-]{35}\b/, true],
  ['clave-api-sk', /\bsk-[A-Za-z0-9_-]{20,}/, true],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, true],
  ['url-con-credenciales', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i, true],
  ['ruta-local-windows', /\b[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s'"`]+/, false],
  ['ruta-local-unix', /(?:^|[\s'"`(=])\/(?:home|Users)\/[A-Za-z0-9._-]+\//, false],
  ['telefono', /(?<![\d.])(?:\+?593|0)9\d{8}(?!\d)/, false],
];
// Literal entre comillas asignado a un nombre sensible, o línea tipo .env (CLAVE=valor).
const ASSIGNED = /\b([A-Za-z_]*(?:secret|token|passw(?:or)?d|api[_-]?key|private[_-]?key)[A-Za-z_]*)\s*[:=]\s*(?:'([^'\s]{12,})'|"([^"\s]{12,})"|`([^`\s]{12,})`)|^\s*([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY))=([^\s#]{8,})\s*$/gi;
const EMAIL = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

function classify(line) {
  const found = [];
  for (const [type, re, real] of PATTERNS) {
    const m = line.match(re);
    if (m && !(type === 'telefono' && /593990000000/.test(m[0]))) found.push({ type, real });
  }
  for (const m of line.matchAll(ASSIGNED)) {
    const name = m[1] ?? m[5];
    const value = m[2] ?? m[3] ?? m[4] ?? m[6];
    if (!SAFE_VALUE.test(value)) found.push({ type: `literal-asignado-a-nombre-sensible (${name})`, real: false });
  }
  for (const m of line.matchAll(EMAIL)) {
    if (!SAFE_EMAIL_DOMAIN.test(m[1])) found.push({ type: `correo-con-dominio-no-reservado (@${m[1].toLowerCase()})`, real: false });
  }
  return found;
}

function git(args, input) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, input });
  if (r.status !== 0) throw new Error(`git ${args[0]} falló`);
  return r.stdout;
}

function scanTree() {
  const files = git(['ls-files', '-co', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  const hits = [];
  for (const file of files) {
    if (SKIP_EXT.test(file) || SKIP_PATH.test(file) || !existsSync(file)) continue;
    const buffer = readFileSync(file);
    if (buffer.includes(0)) continue;
    buffer.toString('utf8').split(/\r?\n/).forEach((line, i) => {
      for (const f of classify(line)) hits.push({ file, line: i + 1, ...f });
    });
  }
  return { files: files.length, hits };
}

function report(title, hits, extra = '') {
  const grouped = new Map();
  for (const h of hits) {
    const key = `${h.type}\t${h.file}`;
    const g = grouped.get(key) ?? { ...h, lines: [], commits: new Set() };
    g.lines.push(h.line);
    if (h.commit) g.commits.add(h.commit);
    grouped.set(key, g);
  }
  console.log(`${title}${extra}`);
  if (grouped.size === 0) console.log('  Sin hallazgos.');
  const quiet = (g) => g.type.startsWith('literal-asignado') && /^(tests\/|docs\/mvp\/evidencias\/)/.test(g.file);
  const summarized = [...grouped.values()].filter(quiet);
  if (summarized.length) {
    console.log(`  [dato a revisar] literal-asignado-a-nombre-sensible · ${new Set(summarized.map((g) => g.file)).size} archivo(s) de tests/ y evidencias/ (resumidos; se revisan a mano, valores no impresos)`);
  }
  for (const g of [...grouped.values()].filter((x) => !quiet(x)).sort((a, b) => a.type.localeCompare(b.type) || a.file.localeCompare(b.file))) {
    const where = g.commits.size
      ? `${g.lines.length} línea(s) añadida(s) en ${g.commits.size} commit(s), el primero ${[...g.commits][0]}`
      : `línea(s) ${[...new Set(g.lines)].slice(0, 8).join(', ')}${new Set(g.lines).size > 8 ? ', …' : ''}`;
    console.log(`  [${g.real ? 'POSIBLE SECRETO' : 'dato a revisar'}] ${g.type} · ${g.file} · ${where}`);
  }
  return [...grouped.values()].filter((g) => g.real).length;
}

function scanHistory() {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['log', '--all', '--no-color', '-p', '--format=@@COMMIT %h'], { maxBuffer: Infinity });
    const hits = [];
    let commit = '';
    let file = '';
    let rest = '';
    let commits = 0;
    const handle = (line) => {
      if (line.startsWith('@@COMMIT ')) { commit = line.slice(9); commits += 1; return; }
      if (line.startsWith('+++ b/')) { file = line.slice(6); return; }
      if (line.startsWith('+++') || !line.startsWith('+') || !file) return;
      if (SKIP_EXT.test(file) || SKIP_PATH.test(file)) return;
      for (const f of classify(line.slice(1))) hits.push({ file, commit, line: 0, ...f });
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      const parts = (rest + chunk).split('\n');
      rest = parts.pop();
      parts.forEach(handle);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (rest) handle(rest);
      if (code !== 0) reject(new Error('git log falló'));
      else resolve({ commits, hits });
    });
  });
}

function envLocal() {
  if (!existsSync('.env')) { console.log('No hay .env local: nada que comparar.'); return 0; }
  const values = new Map();
  for (const raw of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    const v = m?.[2].replace(/^(['"])(.*)\1$/, '$2');
    if (m && v && v.length >= 6 && !/^(true|false|development|test|production|localhost)$/i.test(v)) values.set(m[1], v);
  }
  console.log(`Variables locales con valor comparable: ${values.size} (solo se muestran sus nombres).`);
  let leaked = 0;
  for (const [name, value] of values) {
    const tree = spawnSync('git', ['grep', '-I', '-q', '-F', '--untracked', '-e', value, '--', '.', ':!.env'], { encoding: 'utf8' }).status === 0;
    const hist = git(['log', '--all', '--format=%h', '-G', value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')]).trim().length > 0;
    console.log(`  ${name}: árbol ${tree ? 'COINCIDE' : 'no aparece'} · historial ${hist ? 'COINCIDE' : 'no aparece'}`);
    if (tree || hist) leaked += 1;
  }
  return leaked;
}

const mode = process.argv[2];
let flagged = 0;
if (mode === 'arbol') {
  const { files, hits } = scanTree();
  flagged = report('Árbol de trabajo (archivos versionados y no ignorados)', hits, ` · ${files} archivos revisados`);
} else if (mode === 'historial') {
  const { commits, hits } = await scanHistory();
  flagged = report('Historial (líneas añadidas en todas las ramas)', hits, ` · ${commits} commits revisados`);
} else if (mode === 'env-local') {
  flagged = envLocal();
} else {
  console.error('Uso: node docs/mvp/evidencias/B3.3/buscar-secretos.mjs arbol|historial|env-local');
  process.exit(2);
}
console.log(`Resultado: ${flagged} hallazgo(s) de tipo posible secreto${mode === 'env-local' ? ' (coincidencias con el .env local)' : ''}.`);
process.exitCode = flagged > 0 ? 1 : 0;
