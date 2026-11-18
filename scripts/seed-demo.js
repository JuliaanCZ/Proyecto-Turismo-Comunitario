import { createHash } from 'node:crypto';
import console from 'node:console';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';
import { loadConfig } from '../src/config.js';
import { createContainer } from '../src/container.js';
import { toEcuadorLocalDateTime } from '../src/shared/time.js';

/**
 * Sembrado de la demostración (B2.2). Usa SOLO las API públicas de `accounts`, `offers` y `chat`
 * del contenedor: no escribe SQL ni importa repositorios.
 *
 * Es idempotente: cada fila se identifica por una clave natural (correo, título de la oferta,
 * `clientMessageId` fijo del mensaje) y, si ya existe, se conserva tal cual. Ejecutarlo de nuevo no
 * duplica nada. Las fechas se calculan a partir del momento de la PRIMERA ejecución; ver
 * `docs/mvp/demo.md` para lo que ocurre al repetirlo días después.
 */

export const DEMO_DOMAIN = '@demo.test';
const DEFAULT_ASSETS_DIR = fileURLToPath(new URL('../public/img/', import.meta.url));
const DAY_MS = 86_400_000;

export const DEMO_USERS = Object.freeze([
  Object.freeze({ key: 'ana', email: `ana${DEMO_DOMAIN}`, displayName: 'Ana Quispe' }),
  Object.freeze({ key: 'luis', email: `luis${DEMO_DOMAIN}`, displayName: 'Luis Tupiza' }),
]);

const PHOTOS = Object.freeze({
  sierra: { file: 'sierra.jpg', alt: 'Laguna del Quilotoa vista desde el cráter' },
  costa: { file: 'costa.jpg', alt: 'Playa de Los Frailes vista desde el mirador' },
  amazonia: { file: 'amazonia.jpg', alt: 'Río Napo rodeado de bosque cerca de Puerto Misahuallí' },
  galapagos: { file: 'galapagos.jpg', alt: 'Playa de Bahía Tortuga en la isla Santa Cruz' },
});

const FICTICIA = 'Experiencia ficticia creada solo para la demostración académica.';

function offer(owner, days, time, province, title, locationText, capacity, description, photo) {
  return Object.freeze({ owner, days, time, province, title, locationText, capacity,
    description: description + ' ' + FICTICIA, photo, publish: true });
}

export const DEMO_OFFERS = Object.freeze([
  offer('ana', 7, '08:00', 'COTOPAXI', 'Caminata al borde del Quilotoa', 'Comunidad Quilotoa, Pujilí', 18,
    'Recorre el borde de la laguna con una guía de la comunidad y conoce el paisaje del páramo.', 'sierra'),
  offer('luis', 10, '09:00', 'MANABI', 'Senderos y costa en Los Frailes', 'Ingreso al sendero de Los Frailes, Machalilla', 12,
    'Explora senderos del bosque seco y miradores costeros con interpretación del entorno.', 'costa'),
  offer('ana', 14, '08:30', 'NAPO', 'Saberes y senderos junto al río Napo', 'Puerto Misahuallí, Tena', 10,
    'Camina junto al río e intercambia saberes sobre la selva y las plantas de la comunidad.', 'amazonia'),
  offer('luis', 18, '07:45', 'GALAPAGOS', 'Caminata interpretativa en Bahía Tortuga', 'Entrada al sendero de Bahía Tortuga, Santa Cruz', 8,
    'Sigue un sendero de la isla con una guía local y observa el paisaje costero y su fauna.', 'galapagos'),
]);

const MESSAGE_TEXTS = Object.freeze([
  ['ana', 'Hola, Luis. ¿Listo para la demostración de la tarde?'],
  ['luis', 'Hola, Ana. Sí, ya revisé las salidas de Los Frailes y Bahía Tortuga.'],
  ['ana', 'Perfecto. Yo publiqué la caminata al Quilotoa y la visita al Napo.'],
  ['luis', 'Genial. Cuando abras el chat te aviso si aparece algo nuevo.'],
  ['ana', 'Gracias. Mañana confirmo los cupos con cada comunidad.'],
]);

/** UUID con forma válida de versión 4, derivado de un texto fijo: los reintentos no duplican. */
export function demoMessageId(index) {
  const hex = createHash('sha1').update(`demo-seed:mensaje:${index}`).digest('hex');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function startsAtLocal(now, days, time) {
  return `${toEcuadorLocalDateTime(now + days * DAY_MS).slice(0, 10)}T${time}`;
}

async function loadPhoto(assetsDir, { file, alt }) {
  const source = await readFile(resolve(assetsDir, file));
  const imageBytes = await sharp(source).resize(1200, 800, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer();
  return { contentType: 'image/jpeg', altText: alt, imageBytes: new Uint8Array(imageBytes) };
}

async function ensureUser({ accounts }, definition, password) {
  let created = false;
  try {
    await accounts.registerUser({
      displayName: definition.displayName,
      email: definition.email,
      password,
      passwordConfirm: password,
    });
    created = true;
  } catch (error) {
    if (error?.code !== 'EMAIL_TAKEN') throw error;
  }
  try {
    const user = await accounts.authenticate(definition.email, password);
    return { principal: { userId: user.userId, displayName: user.displayName }, created };
  } catch (error) {
    if (error?.code === 'INVALID_CREDENTIALS') {
      throw new Error(
        `${definition.email} ya existe con otra contraseña. El seed no cambia contraseñas: usa la `
        + 'misma SEED_DEMO_PASSWORD con la que se creó o prepara una base nueva.',
      );
    }
    throw error;
  }
}

/** Identificadores de cliente ya guardados, leyendo todo el historial por la API pública del chat. */
async function knownClientMessageIds(chat) {
  const known = new Set();
  let query = { limit: 100 };
  for (;;) {
    const { messages, hasMore } = await chat.getHistory(query);
    for (const message of messages) known.add(message.clientMessageId);
    if (!hasMore || !messages.length) return known;
    query = { limit: 100, before: messages[0].id };
  }
}

async function listAllOwn(offers, principal) {
  const found = new Map();
  for (let page = 1; ; page += 1) {
    const result = await offers.listOffers(principal, { pagina: page });
    for (const item of result.items) found.set(item.title, item);
    if (page >= result.totalPages) return found;
  }
}

/**
 * Siembra cuentas, ofertas y mensajes. `container` aporta `accounts`, `offers`, `chat` y `clock`.
 * Devuelve un resumen sin credenciales.
 */
export async function seedDemo({ container, password, assetsDir = DEFAULT_ASSETS_DIR, log = () => {} }) {
  if (typeof password !== 'string' || password.length < 10) {
    throw new Error('SEED_DEMO_PASSWORD debe tener al menos 10 caracteres.');
  }
  const { offers, chat, clock } = container;
  const now = clock.now();

  const principals = new Map();
  const summary = { users: { created: 0, kept: 0 }, offers: { created: 0, kept: 0, expired: [] },
    photos: { set: 0 }, published: { set: 0 }, messages: { created: 0, kept: 0 } };

  for (const definition of DEMO_USERS) {
    const { principal, created } = await ensureUser(container, definition, password);
    principals.set(definition.key, principal);
    summary.users[created ? 'created' : 'kept'] += 1;
    log(`${created ? 'Creada' : 'Conservada'} la cuenta ${definition.email}.`);
  }

  const existing = new Map(await Promise.all([...principals].map(async ([key, principal]) =>
    [key, await listAllOwn(offers, principal)])));
  for (const def of DEMO_OFFERS) {
    const principal = principals.get(def.owner);
    const mine = existing.get(def.owner);
    let current = mine.get(def.title);
    if (current) {
      summary.offers.kept += 1;
    } else {
      current = await offers.createOffer(principal, {
        title: def.title,
        description: def.description,
        province: def.province,
        locationText: def.locationText,
        startsAt: startsAtLocal(now, def.days, def.time),
        capacity: def.capacity,
        contactPhone: def.owner === 'ana' ? '+12025550101' : '+12025550102',
        contactEmail: def.owner + DEMO_DOMAIN,
      }, { featuredKey: def.photo });
      summary.offers.created += 1;
    }

    const expired = current.startsAt <= now;
    if (expired) summary.offers.expired.push(def.title);
    if (def.photo && !current.hasPhoto) {
      current = await offers.setOfferPhoto(principal, current.id, await loadPhoto(assetsDir, PHOTOS[def.photo]));
      summary.photos.set += 1;
    }
    // Solo hacia adelante: se publica lo que falta y nunca se despublica nada. Una oferta vencida
    // no puede publicarse (C-OFE exige fecha futura); se informa y se deja como está.
    if (def.publish && !current.isPublished && !expired) {
      await offers.updateOffer(principal, current.id, {
        title: current.title,
        description: current.description,
        province: current.province,
        locationText: current.locationText,
        startsAt: current.startsAtLocal,
        capacity: current.capacity,
        contactPhone: current.contactPhone,
        contactEmail: current.contactEmail,
        isPublished: true,
      });
      summary.published.set += 1;
    }
  }

  // Se consulta antes de publicar: reintentar un envío repetido no cambia filas, pero sí consumiría
  // un valor de AUTOINCREMENT, y la repetición del seed no debe tocar nada.
  const knownIds = await knownClientMessageIds(chat);
  for (const [index, [author, text]] of MESSAGE_TEXTS.entries()) {
    const clientMessageId = demoMessageId(index + 1);
    if (knownIds.has(clientMessageId)) {
      summary.messages.kept += 1;
      continue;
    }
    await chat.postMessage(principals.get(author), { clientMessageId, text });
    summary.messages.created += 1;
  }
  return summary;
}

function printSummary(summary) {
  console.log('Base sembrada: Supabase PostgreSQL.');
  console.log(`Cuentas: ${summary.users.created} creadas, ${summary.users.kept} conservadas (${DEMO_USERS.map((u) => u.email).join(', ')}).`);
  console.log('Contraseña: la de SEED_DEMO_PASSWORD (no se muestra).');
  console.log(`Ofertas: ${summary.offers.created} creadas, ${summary.offers.kept} conservadas; fotos nuevas: ${summary.photos.set}; publicaciones nuevas: ${summary.published.set}.`);
  console.log(`Mensajes de chat: ${summary.messages.created} creados, ${summary.messages.kept} conservados.`);
  if (summary.offers.expired.length) {
    console.log(`AVISO: ${summary.offers.expired.length} oferta(s) ya vencieron y no se tocaron (siguen sin aparecer en el catálogo):`);
    for (const title of summary.offers.expired) console.log(`- ${title}`);
    console.log('Para fechas nuevas, edita la fecha en /panel/ofertas.');
  }
}

async function main() {
  const config = loadConfig();
  if (config.appEnv === 'production') {
    throw new Error('seed:demo no se ejecuta con APP_ENV=production.');
  }
  if (!config.seedDemoPassword) throw new Error('SEED_DEMO_PASSWORD es obligatoria para seed:demo.');
  const container = await createContainer(config);
  try {
    printSummary(await seedDemo({ container, password: config.seedDemoPassword }));
  } finally {
    await container.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Sembrado de demostración fallido: ${error.message}`);
    process.exitCode = 1;
  });
}
