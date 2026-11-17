import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { AppError } from '../../src/shared/errors.js';
import { createCsrfToken } from '../../src/shared/http/csrf.js';
import { createSessionFor, fakeAccounts } from '../helpers/auth.js';
import { createTestContext } from '../helpers/context.js';
import { createOffer, createUser } from '../helpers/factories.js';

// B1.9 — panel y navegación. Usa el arnés de B0.5: contexto con base en memoria, usuarios y ofertas
// de fábrica, sesión creada con `createSessionFor` y `fakeAccounts` como resolvedor de sesión.
// El servicio `offers` real aún no existe (B1.4/B1.5): aquí se simula con un doble que cuenta las
// ofertas de la base de pruebas y registra cómo se le llama.

const ORIGIN = 'http://localhost:3000';

function setup(t, { offers } = {}) {
  const sessions = new Map();
  const logged = [];
  const calls = [];
  let ctx;
  const ownOffersDouble = {
    listOffers(principal, query) {
      calls.push({ principal, query });
      const { total } = ctx.db.prepare('SELECT COUNT(*) AS total FROM offers WHERE owner_id = ?').get(principal.userId);
      return { total, items: [] };
    },
  };
  const overrides = {
    accounts: fakeAccounts(sessions),
    logger: { error: (...args) => logged.push(args) },
  };
  if (offers !== 'real') overrides.offers = offers ?? ownOffersDouble;
  ctx = createTestContext({ overrides });
  t.after(() => ctx.close());

  function signIn(displayName = 'Ana Quispe', email = `u${sessions.size}@test.local`) {
    const user = createUser(ctx, { email, displayName });
    const { token, sessionId, cookie } = createSessionFor(ctx, user.id);
    const principal = { userId: user.id, sessionId, displayName, sessionExpiresAt: ctx.clock.now() + 8 * 3_600_000 };
    sessions.set(token, principal);
    return { user, principal, cookie, csrf: createCsrfToken(ctx.container.config.csrfSecret, sessionId) };
  }
  return { ctx, app: ctx.app, signIn, logged, calls };
}

const title = (html) => /<title>([^<]*)<\/title>/.exec(html)?.[1];
const h1s = (html) => [...html.matchAll(/<h1[ >][\s\S]*?<\/h1>/g)].map((m) => m[0]);
const header = (html) => /<header class="cabecera">[\s\S]*?<\/header>/.exec(html)?.[0];
const linkTo = (html, href, text) => new RegExp(`<a [^>]*href="${href}"[^>]*>\\s*${text}`).test(html);

test('TM-NAV-01: /panel sin sesión redirige a /ingreso', async (t) => {
  const { app, calls } = setup(t);
  const res = await request(app).get('/panel');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/ingreso?next=%2Fpanel');
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(calls.length, 0, 'sin sesión no se consulta el resumen');

  const caducada = await request(app).get('/panel').set('Cookie', 'tc_session=token-que-no-existe');
  assert.equal(caducada.status, 302);
  assert.equal(caducada.headers.location, '/ingreso?next=%2Fpanel');
});

test('TM-NAV-02: con sesión, el menú muestra Inicio, Mis ofertas, Chat y Salir', async (t) => {
  const { app, signIn } = setup(t);
  const { cookie, csrf } = signIn();
  const res = await request(app).get('/panel').set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.equal(res.headers['cache-control'], 'no-store');

  const menu = header(res.text);
  assert.ok(menu, 'la página tiene cabecera');
  assert.ok(linkTo(menu, '/panel', 'Inicio'));
  assert.ok(linkTo(menu, '/panel/ofertas', 'Mis ofertas'));
  assert.ok(linkTo(menu, '/panel/chat', 'Chat'));
  assert.match(menu, /<nav aria-label="Principal">/);

  // Contenedor de la insignia de B1.10: existe una sola vez, dentro del menú y oculto.
  assert.equal((res.text.match(/id="chat-badge"/g) ?? []).length, 1);
  assert.match(menu, /<span id="chat-badge"[^>]*\bhidden\b[^>]*><\/span>/);

  // «Salir»: formulario POST a /salir con el token CSRF de la sesión, no un enlace.
  const salir = /<form method="post" action="\/salir">[\s\S]*?<\/form>/.exec(menu)?.[0];
  assert.ok(salir, 'formulario de salida');
  assert.match(salir, new RegExp(`name="_csrf" value="${csrf}"`));
  assert.match(salir, /<button [^>]*type="submit">Salir<\/button>/);
  assert.doesNotMatch(menu, /href="\/salir"/);

  // Inicio es la página actual; no aparecen los enlaces públicos.
  assert.match(menu, /<a href="\/panel" aria-current="page">Inicio<\/a>/);
  assert.doesNotMatch(menu, />Ingresar<|>Crear cuenta</);
});

test('TM-NAV-02: el menú es idéntico en todas las pantallas autenticadas', async (t) => {
  const { app, signIn } = setup(t);
  const { cookie } = signIn();
  const sinActual = (html) => header(html).replaceAll(' aria-current="page"', '');

  const paginas = {};
  for (const ruta of ['/panel', '/', '/panel/no-existe', '/dev/diseno']) {
    const res = await request(app).get(ruta).set('Cookie', cookie);
    paginas[ruta] = res;
    assert.ok(header(res.text), `${ruta} tiene menú`);
  }
  assert.equal(paginas['/panel/no-existe'].status, 404);
  const referencia = sinActual(paginas['/panel'].text);
  for (const [ruta, res] of Object.entries(paginas)) {
    assert.equal(sinActual(res.text), referencia, `el menú de ${ruta} difiere del de /panel`);
  }

  // Solo cambia la marca de página actual.
  assert.equal((paginas['/panel'].text.match(/aria-current="page"/g) ?? []).length, 1);
  assert.equal((paginas['/'].text.match(/aria-current="page"/g) ?? []).length, 0);
});

test('menú público: Ofertas, Ingresar y Crear cuenta, sin Salir ni insignia', async (t) => {
  const { app } = setup(t);
  const res = await request(app).get('/');
  const menu = header(res.text);
  assert.ok(linkTo(menu, '/ofertas', 'Ofertas'));
  assert.ok(linkTo(menu, '/ingreso', 'Ingresar'));
  assert.ok(linkTo(menu, '/registro', 'Crear cuenta'));
  assert.doesNotMatch(menu, /Salir|chat-badge|Mis ofertas|name="_csrf"/);
});

test('TM-NAV-03: una ruta inexistente muestra el 404 con enlace de regreso y sin trazas', async (t) => {
  const { app, signIn, logged } = setup(t);

  const anonimo = await request(app).get('/no-existe');
  assert.equal(anonimo.status, 404);
  assert.match(anonimo.headers['content-type'], /text\/html/);
  assert.deepEqual(h1s(anonimo.text), ['<h1>No encontramos esa página</h1>']);
  assert.equal(title(anonimo.text), 'Página no encontrada · Turismo comunitario');
  assert.match(anonimo.text, /<a class="btn" href="\/">Volver al inicio<\/a>/);
  assert.doesNotMatch(anonimo.text, /node_modules|\.js:\d+|\bat \S+ \(|stack|NOT_FOUND/);

  // Con sesión el regreso lleva al panel y el menú sigue presente.
  const { cookie } = signIn();
  const conSesion = await request(app).get('/panel/no-existe').set('Cookie', cookie);
  assert.equal(conSesion.status, 404);
  assert.match(conSesion.text, /<a class="btn" href="\/panel">Volver a mi panel<\/a>/);
  assert.match(conSesion.text, /href="\/">Ir a la portada<\/a>/);
  assert.ok(linkTo(header(conSesion.text), '/panel/chat', 'Chat'));
  assert.doesNotMatch(conSesion.text, /node_modules|\.js:\d+|\bat \S+ \(|stack/);

  assert.equal(logged.length, 0, 'un 404 no es un error del servidor');
});

test('403 (origen o token rechazados) muestra una página propia con enlace de regreso', async (t) => {
  const { app, signIn, logged } = setup(t);

  const anonimo = await request(app).post('/registro').type('form').send({ a: '1' });
  assert.equal(anonimo.status, 403);
  assert.deepEqual(h1s(anonimo.text), ['<h1>No pudimos autorizar la acción</h1>']);
  assert.equal(title(anonimo.text), 'Acción no autorizada · Turismo comunitario');
  assert.match(anonimo.text, /ORIGIN_MISMATCH/);
  assert.match(anonimo.text, /<a class="btn" href="\/">Volver al inicio<\/a>/);

  // Con sesión pero sin token CSRF: 403 CSRF_INVALID y regreso al panel.
  const { cookie } = signIn();
  const sinToken = await request(app).post('/salir').set('Origin', ORIGIN).set('Cookie', cookie).type('form').send({});
  assert.equal(sinToken.status, 403);
  assert.match(sinToken.text, /CSRF_INVALID/);
  assert.match(sinToken.text, /<a class="btn" href="\/panel">Volver a mi panel<\/a>/);
  // El 403 de CSRF conoce la sesión: menú autenticado con «Salir», no el público.
  assert.match(header(sinToken.text), /<button [^>]*type="submit">Salir<\/button>/);
  assert.doesNotMatch(header(sinToken.text), />Ingresar<|>Crear cuenta</);
  assert.doesNotMatch(sinToken.text, /node_modules|\.js:\d+|\bat \S+ \(/);
  assert.equal(logged.length, 0);
});

test('Cache-Control: no-store en la portada con sesión y en el formulario Salir con su CSRF', async (t) => {
  const { app, signIn } = setup(t);
  const { cookie, csrf } = signIn();

  const conSesion = await request(app).get('/').set('Cookie', cookie);
  assert.equal(conSesion.status, 200);
  assert.equal(conSesion.headers['cache-control'], 'no-store');
  const salir = /<form method="post" action="\/salir">[\s\S]*?<\/form>/.exec(header(conSesion.text))?.[0];
  assert.ok(salir, 'la portada con sesión incluye el formulario Salir');
  assert.match(salir, new RegExp(`name="_csrf" value="${csrf}"`));

  // La portada pública no es personal: no lleva el token ni se fuerza `no-store`.
  const publica = await request(app).get('/');
  assert.equal(publica.status, 200);
  assert.notEqual(publica.headers['cache-control'], 'no-store');
  assert.doesNotMatch(publica.text, /name="_csrf"/);

  // Una página de error de la sesión (404 fuera de /panel) también es personal.
  const noExiste = await request(app).get('/no-existe').set('Cookie', cookie);
  assert.equal(noExiste.status, 404);
  assert.equal(noExiste.headers['cache-control'], 'no-store');
});

test('POST /panel con sesión y Origin correcto, pero sin token CSRF: 403 y no-store', async (t) => {
  const { app, signIn, logged } = setup(t);
  const { cookie, csrf } = signIn();

  const sinToken = await request(app).post('/panel').set('Origin', ORIGIN).set('Cookie', cookie).type('form').send({});
  assert.equal(sinToken.status, 403);
  assert.equal(sinToken.headers['cache-control'], 'no-store');
  assert.match(sinToken.text, /CSRF_INVALID/);

  const tokenAjeno = await request(app).post('/panel').set('Origin', ORIGIN).set('Cookie', cookie).type('form').send({ _csrf: 'otro' });
  assert.equal(tokenAjeno.status, 403);
  assert.equal(tokenAjeno.headers['cache-control'], 'no-store');

  // Se conservan las comprobaciones: con origen y token válidos la petición pasa el CSRF (no hay POST /panel: 404).
  const valido = await request(app).post('/panel').set('Origin', ORIGIN).set('Cookie', cookie).type('form').send({ _csrf: csrf });
  assert.equal(valido.status, 404);
  assert.equal(valido.headers['cache-control'], 'no-store');

  // Sin Origin o con otro sitio sigue siendo ORIGIN_MISMATCH, aun con token válido.
  for (const origin of [undefined, 'https://otro.example']) {
    const req = request(app).post('/panel').set('Cookie', cookie).type('form');
    if (origin) req.set('Origin', origin);
    const res = await req.send({ _csrf: csrf });
    assert.equal(res.status, 403, String(origin));
    assert.match(res.text, /ORIGIN_MISMATCH/);
    assert.equal(res.headers['cache-control'], 'no-store', String(origin));
  }
  assert.equal(logged.length, 0);
});

test('los errores anteriores a requireAuth en /panel y /api también llevan no-store', async (t) => {
  const { app } = setup(t);

  // Sin sesión: origen rechazado, cuerpo mal formado, 401 y 404 de la API.
  const origen = await request(app).post('/panel').type('form').send({});
  assert.equal(origen.status, 403);
  assert.match(origen.text, /ORIGIN_MISMATCH/);
  assert.equal(origen.headers['cache-control'], 'no-store');

  const jsonRoto = await request(app).post('/panel').set('Origin', ORIGIN).set('Content-Type', 'application/json').send('{no es json');
  assert.equal(jsonRoto.status, 422);
  assert.equal(jsonRoto.headers['cache-control'], 'no-store');

  const apiOrigen = await request(app).post('/api/lo-que-sea').send({});
  assert.equal(apiOrigen.status, 403);
  assert.equal(apiOrigen.body.error.code, 'ORIGIN_MISMATCH');
  assert.equal(apiOrigen.headers['cache-control'], 'no-store');

  const api401 = await request(app).get('/api/lo-que-sea');
  assert.equal(api401.status, 401);
  assert.equal(api401.headers['cache-control'], 'no-store');

  const post302 = await request(app).post('/panel').set('Origin', ORIGIN).type('form').send({});
  assert.equal(post302.status, 302);
  assert.equal(post302.headers.location, '/ingreso?next=%2Fpanel');
  assert.equal(post302.headers['cache-control'], 'no-store');
});

test('TM-NAV-04: el nombre del usuario se muestra escapado', async (t) => {
  const { app, signIn } = setup(t);
  const { cookie } = signIn('<b>Ana</b>');

  for (const ruta of ['/panel', '/', '/panel/no-existe']) {
    const res = await request(app).get(ruta).set('Cookie', cookie);
    assert.ok(res.text.includes('&lt;b&gt;Ana&lt;/b&gt;'), `${ruta}: el nombre aparece como texto`);
    assert.ok(!res.text.includes('<b>Ana</b>'), `${ruta}: el nombre no se interpreta como HTML`);
  }
  const panel = await request(app).get('/panel').set('Cookie', cookie);
  assert.deepEqual(h1s(panel.text), ['<h1>Hola, &lt;b&gt;Ana&lt;/b&gt;</h1>']);

  const hostil = signIn('"><script>alert(1)</script>').cookie;
  const res = await request(app).get('/panel').set('Cookie', hostil);
  assert.ok(!res.text.includes('<script>alert(1)'));
  assert.ok(res.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('TM-NAV-05: el resumen refleja el número real de ofertas del usuario', async (t) => {
  const { app, ctx, signIn, calls } = setup(t);
  const ana = signIn('Ana Quispe');
  const luis = signIn('Luis Tapia');
  const sin = signIn('Rosa Cando');
  for (let i = 0; i < 3; i += 1) createOffer(ctx, ana.user.id, { title: `Oferta de Ana ${i}` });
  createOffer(ctx, luis.user.id, { title: 'Oferta de Luis' });

  const numero = (html) => /<span class="resumen__numero">(\d+)<\/span>\s*<span>([^<]+)<\/span>/.exec(html)?.slice(1);

  const deAna = await request(app).get('/panel').set('Cookie', ana.cookie);
  assert.deepEqual(numero(deAna.text), ['3', 'ofertas propias']);
  const deLuis = await request(app).get('/panel').set('Cookie', luis.cookie);
  assert.deepEqual(numero(deLuis.text), ['1', 'oferta propia']);

  // Sin ofertas: se muestra el 0 real y la invitación a crear la primera.
  const vacio = await request(app).get('/panel').set('Cookie', sin.cookie);
  assert.deepEqual(numero(vacio.text), ['0', 'ofertas propias']);
  assert.match(vacio.text, /Aún no tienes ofertas/);

  // Una oferta nueva se refleja en la siguiente visita.
  createOffer(ctx, sin.user.id);
  assert.deepEqual(numero((await request(app).get('/panel').set('Cookie', sin.cookie)).text), ['1', 'oferta propia']);

  // Contrato: listOffers(principal, { pagina: 1 }) con el principal de la sesión.
  assert.deepEqual(calls[0].query, { pagina: 1 });
  assert.equal(calls[0].principal.userId, ana.user.id);
  assert.equal(calls[0].principal.displayName, 'Ana Quispe');

  // Accesos del panel.
  assert.ok(linkTo(deAna.text, '/panel/ofertas/nueva', 'Crear una oferta'));
  assert.ok(linkTo(deAna.text, '/panel/ofertas', 'Ver mis ofertas'));
  assert.ok(linkTo(deAna.text, '/panel/chat', 'Ir al chat'));
});

test('sin el servicio de ofertas (NOT_IMPLEMENTED) el panel abre, avisa y no inventa cifras', async (t) => {
  const { app, signIn, logged } = setup(t, { offers: 'real' });
  const { cookie } = signIn();
  const res = await request(app).get('/panel').set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.match(res.text, /<strong>Atención:<\/strong> el resumen de tus ofertas no está disponible/);
  assert.doesNotMatch(res.text, /resumen__numero|ofertas? propias?/);
  assert.ok(linkTo(res.text, '/panel/chat', 'Ir al chat'));
  assert.equal(logged.length, 0, 'NOT_IMPLEMENTED es esperado y no ensucia el registro');
});

test('si el servicio de ofertas falla o responde mal, el panel abre sin cifra y el fallo queda en el registro', async (t) => {
  const secreto = 'fallo C:\\privado\\clave.sqlite';
  for (const [caso, listOffers] of [
    ['lanza', () => { throw new Error(secreto); }],
    ['rechaza', async () => { throw AppError.fromCatalog('INTERNAL_ERROR', secreto); }],
    ['total inválido', () => ({ total: -1 })],
    ['sin total', () => ({ items: [] })],
    ['total no numérico', () => ({ total: '3' })],
  ]) {
    const { app, signIn, logged } = setup(t, { offers: { listOffers } });
    const { cookie } = signIn();
    const res = await request(app).get('/panel').set('Cookie', cookie);
    assert.equal(res.status, 200, caso);
    assert.match(res.text, /no está disponible por ahora/, caso);
    assert.doesNotMatch(res.text, /resumen__numero|privado|clave\.sqlite/, caso);
    assert.equal(logged.length, 1, `${caso}: un registro`);
  }
});

test('el servicio de ofertas asíncrono también alimenta el resumen', async (t) => {
  const { app, signIn } = setup(t, { offers: { listOffers: async () => ({ total: 7 }) } });
  const { cookie } = signIn();
  const res = await request(app).get('/panel').set('Cookie', cookie);
  assert.match(res.text, /<span class="resumen__numero">7<\/span>\s*<span>ofertas propias<\/span>/);
});

test('portada: enlaces públicos sin sesión y «Ir a mi panel» con sesión', async (t) => {
  const { app, signIn } = setup(t);

  const publica = await request(app).get('/');
  assert.equal(publica.status, 200);
  assert.deepEqual(h1s(publica.text), ['<h1 id="t-portada">Turismo comunitario</h1>']);
  assert.equal(title(publica.text), 'Inicio · Turismo comunitario');
  const cuerpo = /<main[\s\S]*<\/main>/.exec(publica.text)[0];
  assert.ok(linkTo(cuerpo, '/ofertas', 'Ver ofertas'));
  assert.ok(linkTo(cuerpo, '/ingreso', 'Ingresar'));
  assert.ok(linkTo(cuerpo, '/registro', 'Crear cuenta'));
  assert.doesNotMatch(cuerpo, /Ir a mi panel/);

  const { cookie } = signIn();
  const privada = await request(app).get('/').set('Cookie', cookie);
  const cuerpoPrivado = /<main[\s\S]*<\/main>/.exec(privada.text)[0];
  assert.ok(linkTo(cuerpoPrivado, '/panel', 'Ir a mi panel'));
  assert.doesNotMatch(cuerpoPrivado, />Ingresar<|>Crear cuenta</);
});

test('accesibilidad: salto al contenido, un h1 y un título propios por pantalla', async (t) => {
  const { app, signIn } = setup(t);
  const { cookie } = signIn();
  const titulos = new Map();
  const pantallas = [
    ['/', undefined],
    ['/panel', cookie],
    ['/no-existe', undefined],
    ['/panel/no-existe', cookie],
  ];
  for (const [ruta, cookieDePantalla] of pantallas) {
    const req = request(app).get(ruta);
    const res = cookieDePantalla ? await req.set('Cookie', cookieDePantalla) : await req;
    assert.match(res.text, /<html lang="es-EC">/, ruta);
    assert.match(res.text, /<a class="saltar" href="#contenido">Saltar al contenido<\/a>/, ruta);
    assert.match(res.text, /<main id="contenido"/, ruta);
    assert.match(res.text, /name="viewport" content="width=device-width, initial-scale=1"/, ruta);
    assert.equal(h1s(res.text).length, 1, `${ruta}: un solo h1`);
    assert.match(title(res.text), /^.+ · Turismo comunitario$/, ruta);
    titulos.set(ruta, title(res.text));
  }
  assert.equal(titulos.get('/panel'), 'Mi panel · Turismo comunitario');
  // El 404 público y el del panel comparten pantalla; portada, panel y 404 son distintos entre sí.
  assert.equal(new Set([titulos.get('/'), titulos.get('/panel'), titulos.get('/no-existe')]).size, 3);
});
