import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { ESLint } from 'eslint';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createContainer } from '../../src/container.js';
import { createGateway } from '../../src/realtime/gateway.js';
import { fixedClock } from '../../src/shared/clock.js';
import { openDb } from '../../src/shared/db.js';
import { AppError } from '../../src/shared/errors.js';
import { createCsrfToken, isValidCsrfToken } from '../../src/shared/http/csrf.js';
import { safeNext } from '../../src/shared/http/safe-next.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ORIGIN = 'http://localhost:3000';
const TOKEN = 'tok-valido';
const COOKIE = `tc_session=${TOKEN}`;
const PRINCIPAL = Object.freeze({
  userId: 1,
  sessionId: 'sesion-1',
  displayName: 'Ana Quispe',
  sessionExpiresAt: 9_999_999_999_999,
});

// Servicio de cuentas falso: la sesión simulada de B0.5 hace lo mismo con `fakeAccounts`.
const fakeAccounts = {
  resolveSession(token) {
    return token === TOKEN ? PRINCIPAL : null;
  },
};

const testConfig = (env = {}) => loadConfig({ APP_ENV: 'test', ...env });

function build(t, { env, overrides } = {}) {
  const logged = [];
  const config = testConfig(env);
  const container = createContainer(config, {
    db: openDb(':memory:'),
    accounts: fakeAccounts,
    logger: { error: (...args) => logged.push(args) },
    ...overrides,
  });
  t.after(() => container.close());
  return { app: createApp(container), container, config, logged };
}

const csrfFrom = (html) => /name="_csrf" value="([^"]+)"/.exec(html)?.[1];

test('TM-WEB-01: POST sin Origin → 403 ORIGIN_MISMATCH', async (t) => {
  const { app } = build(t);
  const page = await request(app).post('/registro').type('form').send({ a: '1' });
  assert.equal(page.status, 403);
  assert.match(page.text, /ORIGIN_MISMATCH/);

  const api = await request(app).post('/api/x').send({});
  assert.equal(api.status, 403);
  assert.equal(api.body.error.code, 'ORIGIN_MISMATCH');
});

test('TM-WEB-02: POST con Origin de otro sitio → 403; GET, HEAD y OPTIONS no lo exigen', async (t) => {
  const { app } = build(t);
  for (const origin of ['https://evil.test', 'http://localhost:3001', 'null', `${ORIGIN}/`, 'HTTP://LOCALHOST:3000']) {
    const res = await request(app).post('/api/x').set('Origin', origin).send({});
    assert.equal(res.status, 403, `Origin ${origin}`);
    assert.equal(res.body.error.code, 'ORIGIN_MISMATCH');
  }
  // Con el origen exacto la petición pasa el guardián y, sin sesión, la corta requireAuth (no el origen).
  const ok = await request(app).post('/api/x').set('Origin', ORIGIN).send({});
  assert.equal(ok.status, 401);

  assert.equal((await request(app).get('/')).status, 200);
  assert.equal((await request(app).head('/')).status, 200);
  assert.notEqual((await request(app).options('/')).status, 403);
});

test('TM-WEB-03: con sesión, POST sin token CSRF → 403; con token → pasa el guardián', async (t) => {
  const { app, config } = build(t);
  const post = () => request(app).post('/dev/diseno').set('Origin', ORIGIN).set('Cookie', COOKIE);
  const valid = { nombre: 'Ana', correo: 'ana@ejemplo.ec', cupo: '12' };

  const sin = await post().type('form').send(valid);
  assert.equal(sin.status, 403);
  assert.match(sin.text, /CSRF_INVALID/);

  const apiSin = await request(app).post('/api/x').set('Origin', ORIGIN).set('Cookie', COOKIE).send({});
  assert.equal(apiSin.body.error.code, 'CSRF_INVALID');

  assert.equal((await post().type('form').send({ ...valid, _csrf: 'inventado' })).status, 403);
  const ajeno = createCsrfToken(config.csrfSecret, 'otra-sesion');
  assert.equal((await post().type('form').send({ ...valid, _csrf: ajeno })).status, 403);
  assert.equal((await post().set('x-csrf-token', ajeno).type('form').send(valid)).status, 403);

  // El token que la propia página entrega (res.locals.csrfToken) sirve en el campo _csrf y en la cabecera.
  const pagina = await request(app).get('/dev/diseno').set('Cookie', COOKIE);
  const token = csrfFrom(pagina.text);
  assert.equal(token, createCsrfToken(config.csrfSecret, PRINCIPAL.sessionId));

  const porCampo = await post().type('form').send({ ...valid, _csrf: token });
  assert.equal(porCampo.status, 200);
  assert.match(porCampo.text, /el servidor validó los datos/);
  const porCabecera = await post().set('x-csrf-token', token).type('form').send(valid);
  assert.equal(porCabecera.status, 200);
  // Con token válido y datos inválidos responde el formulario (422), no el guardián (403).
  assert.equal((await post().type('form').send({ nombre: '', _csrf: token })).status, 422);

  // Sin sesión no hay token que exigir: el origen ya se comprobó.
  const anonimo = await request(app).post('/dev/diseno').set('Origin', ORIGIN).type('form').send(valid);
  assert.equal(anonimo.status, 200);
});

test('TM-WEB-04: /panel sin sesión → 302 a /ingreso?next=%2Fpanel; /api/x sin sesión → 401 JSON', async (t) => {
  const { app } = build(t);
  const panel = await request(app).get('/panel');
  assert.equal(panel.status, 302);
  assert.equal(panel.headers.location, '/ingreso?next=%2Fpanel');

  const anidado = await request(app).get('/panel/ofertas?pagina=2');
  assert.equal(anidado.headers.location, '/ingreso?next=%2Fpanel%2Fofertas%3Fpagina%3D2');

  // Un POST no vuelve a su propia ruta tras ingresar: va al panel.
  const post = await request(app).post('/panel/ofertas/1/eliminar').set('Origin', ORIGIN);
  assert.equal(post.headers.location, '/ingreso?next=%2Fpanel');

  const api = await request(app).get('/api/x');
  assert.equal(api.status, 401);
  assert.match(api.headers['content-type'], /application\/json/);
  assert.equal(api.body.error.code, 'UNAUTHENTICATED');

  // Una cookie que no resuelve a ninguna sesión es lo mismo que no tener cookie.
  const rancia = await request(app).get('/panel').set('Cookie', 'tc_session=caducada');
  assert.equal(rancia.status, 302);

  // Con sesión pasa la barrera: /panel lo sirve B1.9 (200) y una ruta del panel sin implementar sigue en 404.
  const conSesion = await request(app).get('/panel').set('Cookie', COOKIE);
  assert.equal(conSesion.status, 200);
  assert.equal((await request(app).get('/panel/no-existe').set('Cookie', COOKIE)).status, 404);
  const apiConSesion = await request(app).get('/api/x').set('Cookie', COOKIE);
  assert.equal(apiConSesion.status, 404);
  assert.equal(apiConSesion.body.error.code, 'NOT_FOUND');
});

test('TM-WEB-05: safeNext rechaza //evil.test, /\\evil y https://x; acepta /panel/ofertas?pagina=2', () => {
  for (const hostil of [
    '//evil.test', '/\\evil', 'https://x', 'http://localhost:3000/panel', '/\\/evil', '/panel//x', '/panel\\x',
    '/panel/../ingreso', '/panel/%2e%2e/ingreso', '/panelx', '/panel\n', '/pan\u0000el', '/ingreso', '/', '', 'panel',
    `/panel/${'a'.repeat(3000)}`, null, undefined, 42, ['/panel'],
  ]) {
    assert.equal(safeNext(hostil), '/panel', `debía rechazar ${JSON.stringify(hostil)?.slice(0, 40)}`);
  }
  assert.equal(safeNext('/panel/ofertas?pagina=2'), '/panel/ofertas?pagina=2');
  assert.equal(safeNext('/panel'), '/panel');
  assert.equal(safeNext('/panel/chat'), '/panel/chat');
  assert.equal(safeNext('/panel?aviso=creada'), '/panel?aviso=creada');
  assert.equal(safeNext('/panel/ofertas?pagina=2', 'https://turismo.example'), '/panel/ofertas?pagina=2');
});

test('TM-WEB-06: cabeceras CSP, X-Content-Type-Options y no-store en /panel', async (t) => {
  const { app } = build(t);
  const home = await request(app).get('/');
  const csp = home.headers['content-security-policy'];
  for (const directive of [
    "default-src 'self'", "script-src 'self'", "style-src 'self'", "connect-src 'self' ws://localhost:3000",
    "object-src 'none'", "frame-ancestors 'none'",
  ]) {
    assert.ok(csp.includes(directive), `CSP sin ${directive}: ${csp}`);
  }
  assert.ok(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval'));
  assert.ok(!csp.includes('upgrade-insecure-requests'), 'en HTTP local no se fuerza HTTPS');
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  assert.equal(home.headers['x-powered-by'], undefined);
  // Con `no-referrer` Chrome envía `Origin: null` en los formularios del propio sitio y originGuard
  // los rechazaría (se vio en el navegador, no con supertest). Debe seguir siendo `same-origin`.
  assert.equal(home.headers['referrer-policy'], 'same-origin');

  const panel = await request(app).get('/panel');
  assert.equal(panel.headers['cache-control'], 'no-store');
  assert.equal(panel.headers['x-content-type-options'], 'nosniff');
  assert.ok(panel.headers['content-security-policy']);
  assert.equal((await request(app).get('/api/x')).headers['cache-control'], 'no-store');
  assert.equal((await request(app).get('/panel').set('Cookie', COOKIE)).headers['cache-control'], 'no-store');
});

test('TM-WEB-06 (HTTPS): connect-src usa wss del origen, cookie __Host- y sin vista de diseño', async (t) => {
  const { app } = build(t, {
    env: {
      APP_ENV: 'production',
      APP_ORIGIN: 'https://turismo.example',
      CSRF_SECRET: 'x'.repeat(32),
    },
  });
  const home = await request(app).get('/');
  const csp = home.headers['content-security-policy'];
  assert.ok(csp.includes("connect-src 'self' wss://turismo.example"), csp);
  assert.ok(csp.includes('upgrade-insecure-requests'));
  assert.ok(home.headers['strict-transport-security']);

  // Con COOKIE_SECURE solo vale __Host-tc_session; la cookie sin prefijo se ignora.
  const host = await request(app).get('/panel').set('Cookie', `__Host-tc_session=${TOKEN}`);
  assert.equal(host.status, 200);
  const plana = await request(app).get('/panel').set('Cookie', COOKIE);
  assert.equal(plana.status, 302);

  assert.equal((await request(app).get('/dev/diseno')).status, 404);
});

test('TM-WEB-07: una ruta inexistente muestra la página 404 sin trazas', async (t) => {
  const { app, logged } = build(t);
  const res = await request(app).get('/no-existe');
  assert.equal(res.status, 404);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /<h1>No encontramos esa página<\/h1>/);
  assert.match(res.text, /<title>[^<]*Turismo comunitario<\/title>/);
  assert.match(res.text, /Saltar al contenido/);
  assert.doesNotMatch(res.text, /node_modules|\.js:\d+|\bat \S+ \(|Error:/);
  assert.equal(logged.length, 0, 'un 404 no es un error del servidor');

  const api = await request(app).get('/api/nada').set('Cookie', COOKIE);
  assert.equal(api.status, 404);
  assert.deepEqual(Object.keys(api.body.error).sort(), ['code', 'message']);
});

test('C-ERR: un error inesperado → INTERNAL_ERROR sin trazas hacia el cliente y con registro en el servidor', async (t) => {
  const secreto = 'fallo C:\\privado\\clave.sqlite token=abc123';
  const { app, logged } = build(t, {
    overrides: { accounts: { resolveSession() { throw new Error(secreto); } } },
  });

  const page = await request(app).get('/').set('Cookie', COOKIE);
  assert.equal(page.status, 500);
  assert.match(page.text, /INTERNAL_ERROR/);
  assert.doesNotMatch(page.text, /privado|abc123|clave\.sqlite|node_modules/);

  const api = await request(app).get('/api/x').set('Cookie', COOKIE);
  assert.equal(api.status, 500);
  assert.equal(api.body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(api.body), /privado|abc123|stack/);

  assert.equal(logged.length, 2);
  assert.equal(logged[0][1].message, secreto);
});

test('C-ERR: AppError → su estado y código, en página o JSON; cuerpo mal formado o mayor de 16 kB → 422', async (t) => {
  const { app } = build(t, {
    overrides: {
      accounts: {
        resolveSession() {
          throw AppError.fromCatalog('TOKEN_INVALID', 'Token inválido.', { fieldErrors: { token: ['Vence en 30 minutos.'] } });
        },
      },
    },
  });
  const api = await request(app).get('/api/x').set('Cookie', COOKIE);
  assert.equal(api.status, 400);
  assert.deepEqual(api.body, {
    error: { code: 'TOKEN_INVALID', message: 'Token inválido.', fieldErrors: { token: ['Vence en 30 minutos.'] } },
  });
  const page = await request(app).get('/').set('Cookie', COOKIE);
  assert.equal(page.status, 400);
  assert.match(page.text, /Token inválido\./);

  const sano = build(t).app;
  const roto = await request(sano).post('/api/x').set('Origin', ORIGIN).set('Content-Type', 'application/json').send('{no es json');
  assert.equal(roto.status, 422);
  assert.equal(roto.body.error.code, 'VALIDATION_ERROR');
  const grande = await request(sano).post('/api/x').set('Origin', ORIGIN).type('form').send(`a=${'x'.repeat(17 * 1024)}`);
  assert.equal(grande.status, 422);
});

test('C-SES: el resolvedor recibe el token y la hora del reloj inyectado; sin cookie no se consulta', async (t) => {
  const calls = [];
  const clock = fixedClock(1_700_000_000_000);
  const { app } = build(t, {
    overrides: {
      clock,
      accounts: { resolveSession: (token, now) => { calls.push([token, now]); return PRINCIPAL; } },
    },
  });
  await request(app).get('/');
  assert.equal(calls.length, 0);
  await request(app).get('/').set('Cookie', 'otra=1; tc_session=abc%20def');
  assert.deepEqual(calls, [['abc def', 1_700_000_000_000]]);
  clock.advance(5000);
  await request(app).get('/').set('Cookie', COOKIE);
  assert.equal(calls[1][1], 1_700_000_005_000);

  // La cabecera muestra la sesión con el nombre escapado.
  const { app: app2 } = build(t, {
    overrides: { accounts: { resolveSession: () => ({ ...PRINCIPAL, displayName: '<img src=x onerror=alert(1)>' }) } },
  });
  const page = await request(app2).get('/').set('Cookie', COOKIE);
  assert.ok(page.text.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!page.text.includes('<img src=x'));
});

test('csrf: el token es determinista, ligado a la sesión y al secreto', () => {
  const a = createCsrfToken('secreto-uno', 's1');
  assert.equal(a, createCsrfToken('secreto-uno', 's1'));
  assert.notEqual(a, createCsrfToken('secreto-uno', 's2'));
  assert.notEqual(a, createCsrfToken('secreto-dos', 's1'));
  assert.equal(isValidCsrfToken('secreto-uno', 's1', a), true);
  for (const mal of [undefined, null, '', 'x', `${a}x`, a.slice(1), [a], { a }]) {
    assert.equal(isValidCsrfToken('secreto-uno', 's1', mal), false);
  }
});

test('TM-WEB-08: npm run lint rechaza un import prohibido (fixture) y acepta los permitidos', async () => {
  const eslint = new ESLint({ cwd: ROOT });
  const lint = async (code, path) => {
    const [result] = await eslint.lintText(code, { filePath: join(ROOT, path) });
    return result.messages.filter((m) => m.ruleId !== null);
  };
  const prohibido = async (code, path) => {
    const rules = (await lint(code, path)).map((m) => m.ruleId);
    assert.deepEqual(rules, ['no-restricted-imports'], `${path}: ${code}`);
  };
  const permitido = async (code, path) => assert.deepEqual(await lint(code, path), [], `${path}: ${code}`);

  const svc = 'src/modules/accounts/service/fixture.js';
  await prohibido("import express from 'express';\nexport { express };", svc);
  await prohibido("import { Server } from 'socket.io';\nexport { Server };", svc);
  await prohibido("import ejs from 'ejs';\nexport { ejs };", svc);
  await prohibido("import { x } from '../../../web/accounts.routes.js';\nexport { x };", svc);
  await prohibido("import { x } from '../../../realtime/gateway.js';\nexport { x };", svc);
  await prohibido("import { x } from '../../offers/data/offers.js';\nexport { x };", svc);
  await prohibido("import { x } from '../../chat/service/chat.js';\nexport { x };", 'src/modules/offers/service/fixture.js');
  await prohibido("import { DatabaseSync } from 'node:sqlite';\nexport { DatabaseSync };", 'src/modules/chat/data/fixture.js');
  await prohibido("import { x } from '../modules/accounts/service/session.js';\nexport { x };", 'src/web/fixture.js');
  await prohibido("import { DatabaseSync } from 'node:sqlite';\nexport { DatabaseSync };", 'src/web/fixture.js');

  await permitido("import { createOffersService } from '../../offers/index.js';\nexport { createOffersService };", svc);
  await permitido("import { AppError } from '../../../shared/errors.js';\nexport { AppError };", svc);
  await permitido("import { x } from '../data/users.js';\nexport { x };", svc);
  await permitido("import express from 'express';\nexport { express };", 'src/web/fixture.js');
  await permitido("import { x } from '../modules/accounts/index.js';\nexport { x };", 'src/web/fixture.js');
  await permitido("import { DatabaseSync } from 'node:sqlite';\nexport { DatabaseSync };", 'src/shared/db.js');

  // Navegador: sin HTML construido con datos (XSS, PLAN-MVP §2.5).
  for (const code of [
    "document.body.innerHTML = 'x';",
    "document.body.outerHTML = 'x';",
    "document.body.insertAdjacentHTML('beforeend', 'x');",
    "document.write('x');",
  ]) {
    const rules = (await lint(code, 'public/js/fixture.js')).map((m) => m.ruleId);
    assert.deepEqual(rules, ['no-restricted-properties'], code);
  }
  await permitido("document.body.textContent = 'x';", 'public/js/fixture.js');
});

test('TM-WEB-08: /js/shared/validate.js se sirve idéntico a src/shared/validation/validate.js', async (t) => {
  const { app } = build(t);
  const fuente = readFileSync(join(ROOT, 'src/shared/validation/validate.js'), 'utf8');
  const res = await request(app).get('/js/shared/validate.js');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /javascript/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.text, fuente);

  // El código de navegador importa ese mismo archivo y usa textContent.
  const formulario = await request(app).get('/js/form-validate.js');
  assert.equal(formulario.status, 200);
  assert.match(formulario.text, /from '\/js\/shared\/validate\.js'/);
  assert.doesNotMatch(formulario.text, /innerHTML/);

  // El estático no sale de su carpeta.
  for (const ruta of ['/js/shared/..%2f..%2ferrors.js', '/js/..%2f..%2fserver.js', '/css/..%2f..%2fconfig.js']) {
    const fuera = await request(app).get(ruta);
    assert.notEqual(fuera.status, 200, ruta);
    assert.doesNotMatch(fuera.text, /AppError|loadConfig/);
  }
  assert.equal((await request(app).get('/css/app.css')).status, 200);
});

test('integración B0.2: createContainer abre la base migrada y la cierra', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tc-b04-'));
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5 }));
  const file = join(dir, 'datos', 'app.sqlite');

  const container = createContainer(testConfig({ DATABASE_FILE: file }), { logger: { error() {} } });
  const versions = container.db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((r) => r.version);
  assert.deepEqual(versions, ['001_base', '010_accounts', '020_offers', '030_chat']);
  const tables = container.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
  for (const name of ['users', 'sessions', 'offers', 'offer_photos', 'chat_messages']) assert.ok(tables.includes(name), name);
  assert.ok(existsSync(file));

  container.close();
  container.close();
  assert.throws(() => container.db.prepare('SELECT 1').get(), /not open|closed/i);

  // Reabrir no repite migraciones.
  const again = createContainer(testConfig({ DATABASE_FILE: file }), { logger: { error() {} } });
  assert.equal(again.db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n, 4);
  again.close();
});

test('createContainer: overrides inyectan servicios, reloj y base; la base inyectada no se cierra', (t) => {
  const db = openDb(':memory:');
  t.after(() => db.close());
  const chat = { postMessage() {} };
  const clock = fixedClock(1);
  const container = createContainer(testConfig(), { db, clock, chat });
  assert.equal(container.chat, chat);
  assert.equal(container.clock, clock);
  assert.equal(container.db, db);
  assert.equal(typeof container.sessionEvents.emit, 'function');
  container.close();
  assert.equal(db.prepare('SELECT 1 AS uno').get().uno, 1);
});

test('esqueleto C-MOD: el módulo de cuentas pendiente lanza NOT_IMPLEMENTED (501)', (t) => {
  const { container } = build(t, { overrides: { accounts: undefined } });
  const esperado = {
    accounts: ['registerUser', 'authenticate', 'createSession', 'resolveSession', 'revokeSession', 'revokeAllSessions',
      'requestPasswordReset', 'resetPassword', 'listMailbox'],
  };
  for (const [modulo, funciones] of Object.entries(esperado)) {
    assert.deepEqual(Object.keys(container[modulo]).sort(), [...funciones].sort(), modulo);
    for (const nombre of funciones) {
      assert.throws(
        () => container[modulo][nombre](),
        (error) => error instanceof AppError && error.code === 'NOT_IMPLEMENTED' && error.status === 501,
        `${modulo}.${nombre}`,
      );
    }
  }
});

test('esqueleto: con las cuentas sin implementar, una cookie de sesión devuelve 501 y sin cookie la app funciona', async (t) => {
  const { app } = build(t, { overrides: { accounts: undefined } });
  assert.equal((await request(app).get('/')).status, 200);
  const res = await request(app).get('/').set('Cookie', COOKIE);
  assert.equal(res.status, 501);
  assert.match(res.text, /NOT_IMPLEMENTED/);
});

test('gateway: onMessageStored registra y messageStored invoca (enganche de C-EVT)', () => {
  const gateway = createGateway({ io: null });
  const seen = [];
  gateway.onMessageStored((message) => seen.push(['a', message.id]));
  gateway.onMessageStored((message) => seen.push(['b', message.id]));
  gateway.messageStored({ id: 7 });
  assert.deepEqual(seen, [['a', 7], ['b', 7]]);
});

test('vista de diseño: formulario con data-schema, errores del servidor asociados al campo y salida escapada', async (t) => {
  const { app } = build(t);
  const get = await request(app).get('/dev/diseno');
  assert.equal(get.status, 200);
  const schema = /data-schema="([^"]+)"/.exec(get.text)[1].replaceAll('&#34;', '"');
  assert.deepEqual(Object.keys(JSON.parse(schema)), ['nombre', 'correo', 'cupo']);
  for (const campo of ['nombre', 'correo', 'cupo']) {
    assert.match(get.text, new RegExp(`data-error-for="${campo}"`));
    assert.match(get.text, new RegExp(`<label class="campo__etiqueta" for="campo-${campo}">`));
  }
  assert.match(get.text, /15 de diciembre de 2026, 09:30 \(hora de Ecuador\)/);

  // Sin JavaScript el servidor valida con el mismo validate.js y repinta el formulario (422).
  const post = await request(app).post('/dev/diseno').set('Origin', ORIGIN).type('form')
    .send({ nombre: '<script>alert(1)</script>', correo: 'no-es-correo', cupo: '1.5' });
  assert.equal(post.status, 422);
  assert.match(post.text, /data-error-for="correo"[^>]*>El correo no tiene un formato válido\./);
  assert.match(post.text, /data-error-for="cupo"[^>]*>El cupo debe ser un número entero\./);
  assert.match(post.text, /aria-invalid="true"/);
  assert.ok(post.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!post.text.includes('<script>alert(1)'));
});
