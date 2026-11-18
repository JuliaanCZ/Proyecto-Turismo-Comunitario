// Contrasta docs/mvp/esquema.md (ER, índices, ON DELETE, tablas) con las migraciones reales.
// Uso (desde la raíz del repositorio): node docs/mvp/evidencias/B3.1/contrastar-esquema.mjs .
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.argv[2];
const { openDb } = await import(pathToFileURL(join(root, 'src/shared/db.js')).href);
const { migrate } = await import(pathToFileURL(join(root, 'src/shared/migrate.js')).href);

const db = openDb(':memory:');
migrate(db, { now: () => 0 });
const md = readFileSync(join(root, 'docs/mvp/esquema.md'), 'utf8').replace(/\r\n/g, '\n');

const problems = [];
const checks = [];
const check = (ok, msg) => { checks.push(ok); if (!ok) problems.push(msg); };

// 1. Tablas reales
const realTables = db.prepare("SELECT name, strict FROM pragma_table_list WHERE schema='main' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('Tablas reales:', realTables.map((t) => `${t.name}${t.strict ? '(STRICT)' : ''}`).join(', '));
check(realTables.length === 8, `se esperaban 8 tablas y hay ${realTables.length}`);
check(realTables.every((t) => t.strict === 1), 'no todas las tablas son STRICT');

// 2. ER: bloque mermaid erDiagram
const er = md.match(/```mermaid\nerDiagram([\s\S]*?)```/)[1];
const erTables = {};
for (const m of er.matchAll(/^\s{2}(\w+) \{\n([\s\S]*?)^\s{2}\}/gm)) {
  erTables[m[1]] = m[2].trim().split('\n').map((l) => {
    const [type, name, ...flags] = l.trim().split(/\s+/);
    return { type, name, flags: flags.join(' ') };
  });
}
const typeMap = { INTEGER: 'integer', TEXT: 'text', BLOB: 'blob' };
for (const t of realTables) {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  const fks = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all();
  const uniqueCols = new Set();
  for (const ix of db.prepare(`PRAGMA index_list(${t.name})`).all()) {
    if (!ix.unique) continue;
    const ic = db.prepare(`PRAGMA index_info(${ix.name})`).all();
    if (ic.length === 1) uniqueCols.add(ic[0].name);
  }
  const doc = erTables[t.name];
  check(Boolean(doc), `${t.name}: no está en el diagrama ER`);
  if (!doc) continue;
  check(doc.length === cols.length, `${t.name}: ER tiene ${doc.length} columnas y la base ${cols.length}`);
  for (const c of cols) {
    const d = doc.find((x) => x.name === c.name);
    check(Boolean(d), `${t.name}.${c.name}: falta en el ER`);
    if (!d) continue;
    check(d.type === typeMap[c.type], `${t.name}.${c.name}: tipo ER ${d.type} vs real ${c.type}`);
    const isPk = c.pk > 0;
    const isFk = fks.some((f) => f.from === c.name);
    const isUk = uniqueCols.has(c.name) && !isPk;
    check(d.flags.includes('PK') === isPk, `${t.name}.${c.name}: PK ER=${d.flags.includes('PK')} real=${isPk}`);
    check(d.flags.includes('FK') === isFk, `${t.name}.${c.name}: FK ER=${d.flags.includes('FK')} real=${isFk}`);
    check(d.flags.includes('UK') === isUk, `${t.name}.${c.name}: UK ER=${d.flags.includes('UK')} real=${isUk}`);
  }
}
check(Object.keys(erTables).length === realTables.length, 'el ER tiene un número distinto de entidades');

// 3. Relaciones del ER frente a las FK reales
const realFks = [];
for (const t of realTables) {
  for (const f of db.prepare(`PRAGMA foreign_key_list(${t.name})`).all()) {
    realFks.push(`${f.table}->${t.name}.${f.from}:${f.on_delete}`);
  }
}
console.log('FK reales:', realFks.join('; '));
const erRels = [...er.matchAll(/^\s{2}(\w+) \|\|--(o[|{]|\|\{) (\w+) :/gm)].map((m) => `${m[1]}->${m[3]}`);
console.log('Relaciones del ER:', erRels.join('; '));
for (const f of realFks) {
  const [parent, rest] = f.split('->');
  const child = rest.split('.')[0];
  check(erRels.includes(`${parent}->${child}`), `FK ${f} no aparece como relación en el ER`);
}
check(erRels.length === realFks.length, `el ER tiene ${erRels.length} relaciones y la base ${realFks.length} FK`);

// 4. ON DELETE documentado
const onDelete = { 'users->sessions.user_id': 'CASCADE', 'users->password_reset_tokens.user_id': 'CASCADE', 'offers->offer_photos.offer_id': 'CASCADE', 'users->offers.owner_id': 'RESTRICT', 'users->chat_messages.author_id': 'RESTRICT' };
for (const f of realFks) {
  const [key, action] = [f.slice(0, f.lastIndexOf(':')), f.slice(f.lastIndexOf(':') + 1)];
  check(onDelete[key] === action, `ON DELETE ${key}: doc ${onDelete[key]} vs real ${action}`);
}

// 5. Índices: los del documento (tabla "Índices y la consulta...") frente a los reales
const realIdx = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
const docIdxSection = md.split('## Índices y la consulta que justifica cada uno')[1].split('Las claves primarias')[0];
const docIdx = [...docIdxSection.matchAll(/^\| `((?:idx|ux)_\w+)` \| ([^|]+) \|/gm)].map((m) => ({ name: m[1], cols: m[2].replace(/\(único\)/, '').replace(/`/g, '').split(',').map((s) => s.trim()) }));
console.log('Índices reales:', realIdx.map((i) => i.name).join(', '));
check(docIdx.length === realIdx.length, `documentados ${docIdx.length} índices, reales ${realIdx.length}`);
for (const r of realIdx) {
  const d = docIdx.find((x) => x.name === r.name);
  check(Boolean(d), `índice ${r.name}: no está documentado`);
  if (!d) continue;
  const cols = db.prepare(`PRAGMA index_info(${r.name})`).all().map((c) => c.name);
  check(JSON.stringify(cols) === JSON.stringify(d.cols), `índice ${r.name}: doc [${d.cols}] vs real [${cols}]`);
}

// 6. Migraciones documentadas
const applied = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((r) => r.version);
console.log('Migraciones aplicadas:', applied.join(', '));
for (const v of applied) check(md.includes(`\`${v}.sql\``), `migración ${v}.sql no figura en esquema.md`);

console.log(`\nComprobaciones: ${checks.length}; fallos: ${problems.length}`);
for (const p of problems) console.log(' - ' + p);
process.exitCode = problems.length ? 1 : 0;
