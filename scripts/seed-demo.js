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
const DEFAULT_ASSETS_DIR = fileURLToPath(new URL('./demo-assets/', import.meta.url));
const DAY_MS = 86_400_000;

export const DEMO_USERS = Object.freeze([
  Object.freeze({ key: 'ana', email: `ana${DEMO_DOMAIN}`, displayName: 'Ana Quispe' }),
  Object.freeze({ key: 'luis', email: `luis${DEMO_DOMAIN}`, displayName: 'Luis Tupiza' }),
]);

/** Fotos: ilustraciones originales del proyecto (ver `demo-assets/CREDITOS.md`). */
const PHOTOS = Object.freeze({
  laguna: { file: 'laguna-andina.svg', alt: 'Ilustración de una laguna rodeada de montañas al atardecer' },
  cacao: { file: 'cacao-fino.svg', alt: 'Ilustración de tres mazorcas de cacao colgando de sus ramas' },
  playa: { file: 'playa-manabi.svg', alt: 'Ilustración de una playa con una palmera y un bote al amanecer' },
  selva: { file: 'selva-napo.svg', alt: 'Ilustración de una balsa en un río rodeado de selva' },
  telar: { file: 'telar-imbabura.svg', alt: 'Ilustración de un tejido con rombos de colores' },
  cafe: { file: 'cafe-altura.svg', alt: 'Ilustración de laderas con cafetales y frutos rojos' },
  paramo: { file: 'paramo-chimborazo.svg', alt: 'Ilustración de un volcán nevado sobre el páramo' },
});

const FICTICIA = 'Experiencia ficticia creada solo para la demostración académica.';

function offer(owner, days, time, province, title, locationText, capacity, description, photo, publish) {
  return Object.freeze({ owner, days, time, province, title, locationText, capacity, description, photo, publish });
}

/** 12 ofertas de Ana en 4 provincias (COTOPAXI, MANABI, NAPO, IMBABURA) y 3 de Luis. */
export const DEMO_OFFERS = Object.freeze([
  offer('ana', 10, '08:00', 'COTOPAXI', 'Caminata guiada a la laguna comunitaria', 'Comunidad Laguna Verde (ficticia)', 12,
    `Ascenso suave de medio día con una guía local hasta la laguna. ${FICTICIA}`, 'laguna', true),
  offer('ana', 20, '09:00', 'COTOPAXI', 'Taller de tejido en lana de oveja', 'Casa comunal de Pilacumbi (ficticia)', 8,
    `Aprende a hilar y tejer con artesanas de la comunidad. ${FICTICIA}`, null, false),
  offer('ana', 25, '18:00', 'COTOPAXI', 'Noche de fogata y leyendas del páramo', 'Mirador Cruz Loma Alta (ficticio)', 20,
    `Fogata, chocolate caliente y relatos de la tradición oral. ${FICTICIA}`, null, false),
  offer('ana', 12, '07:30', 'MANABI', 'Recorrido por la ruta del cacao fino', 'Finca La Esperanza (ficticia)', 15,
    `Visita a la plantación, fermentación y degustación de chocolate. ${FICTICIA}`, 'cacao', true),
  offer('ana', 16, '05:30', 'MANABI', 'Pesca artesanal al amanecer', 'Caleta de Puerto Nuevo (ficticia)', 10,
    `Salida en bote con pescadores de la asociación local. ${FICTICIA}`, 'playa', true),
  offer('ana', 30, '10:00', 'MANABI', 'Cocina costera con productoras locales', 'Cocina comunal Las Palmas (ficticia)', 14,
    `Taller de ceviche, encocados y dulces de la costa. ${FICTICIA}`, null, false),
  offer('ana', 18, '08:30', 'NAPO', 'Paseo en balsa por el río y la selva', 'Embarcadero Río Claro (ficticio)', 10,
    `Navegación tranquila con interpretación de fauna y flora. ${FICTICIA}`, 'selva', true),
  offer('ana', 35, '09:30', 'NAPO', 'Taller de huerto y plantas medicinales', 'Chakra Sumak (ficticia)', 12,
    `Recorrido por la chakra con saberes de la comunidad. ${FICTICIA}`, null, false),
  offer('ana', 40, '06:00', 'NAPO', 'Observación de aves en la reserva comunitaria', 'Reserva Pájaro Azul (ficticia)', 8,
    `Madrugada de observación con binoculares y guía local. ${FICTICIA}`, null, false),
  offer('ana', 21, '09:00', 'IMBABURA', 'Visita al taller de telar y tintes naturales', 'Taller Warmi Maki (ficticio)', 12,
    `Demostración de telar de cintura y tintes con plantas. ${FICTICIA}`, 'telar', true),
  offer('ana', 28, '11:00', 'IMBABURA', 'Mercado campesino y cocina de la sierra', 'Plaza Central de San Pablo (ficticia)', 16,
    `Compras con productores y almuerzo de la cocina andina. ${FICTICIA}`, null, false),
  // Borrador con foto: sirve para comprobar que ni la oferta ni su foto aparecen para visitantes.
  offer('ana', 45, '08:00', 'IMBABURA', 'Borrador privado: ruta del café de altura', 'Finca privada Alto Sol (ficticia)', 6,
    `Borrador de prueba de privacidad; no debe verse en el catálogo. ${FICTICIA}`, 'cafe', false),

  offer('luis', 15, '08:00', 'LOJA', 'Ruta del café de altura con familias productoras', 'Asociación Café Nube (ficticia)', 12,
    `Recorrido por cafetales, tostado y cata guiada. ${FICTICIA}`, 'cafe', true),
  offer('luis', 22, '05:00', 'CHIMBORAZO', 'Amanecer en el páramo del volcán', 'Refugio Páramo Alto (ficticio)', 14,
    `Caminata de madrugada para ver el amanecer sobre el volcán. ${FICTICIA}`, 'paramo', true),
  offer('luis', 33, '10:00', 'LOJA', 'Taller de gastronomía lojana', 'Cocina de Doña Rosa (ficticia)', 10,
    `Preparación de platos tradicionales con recetas familiares. ${FICTICIA}`, null, false),
]);

const MESSAGE_TEXTS = Object.freeze([
  ['ana', 'Hola, Luis. ¿Listo para la demostración de la tarde?'],
  ['luis', 'Hola, Ana. Sí, ya revisé mis ofertas del páramo y del café.'],
  ['ana', 'Perfecto. Yo publiqué la ruta del cacao y la pesca artesanal.'],
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
function knownClientMessageIds(chat) {
  const known = new Set();
  let query = { limit: 100 };
  for (;;) {
    const { messages, hasMore } = chat.getHistory(query);
    for (const message of messages) known.add(message.clientMessageId);
    if (!hasMore || !messages.length) return known;
    query = { limit: 100, before: messages[0].id };
  }
}

function listAllOwn(offers, principal) {
  const found = new Map();
  for (let page = 1; ; page += 1) {
    const result = offers.listOffers(principal, { pagina: page });
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

  const existing = new Map([...principals].map(([key, principal]) => [key, listAllOwn(offers, principal)]));
  for (const def of DEMO_OFFERS) {
    const principal = principals.get(def.owner);
    const mine = existing.get(def.owner);
    let current = mine.get(def.title);
    if (current) {
      summary.offers.kept += 1;
    } else {
      current = offers.createOffer(principal, {
        title: def.title,
        description: def.description,
        province: def.province,
        locationText: def.locationText,
        startsAt: startsAtLocal(now, def.days, def.time),
        capacity: def.capacity,
      });
      summary.offers.created += 1;
    }

    const expired = current.startsAt <= now;
    if (expired) summary.offers.expired.push(def.title);
    if (def.photo && !current.hasPhoto) {
      current = offers.setOfferPhoto(principal, current.id, await loadPhoto(assetsDir, PHOTOS[def.photo]));
      summary.photos.set += 1;
    }
    // Solo hacia adelante: se publica lo que falta y nunca se despublica nada. Una oferta vencida
    // no puede publicarse (C-OFE exige fecha futura); se informa y se deja como está.
    if (def.publish && !current.isPublished && !expired) {
      offers.updateOffer(principal, current.id, {
        title: current.title,
        description: current.description,
        province: current.province,
        locationText: current.locationText,
        startsAt: current.startsAtLocal,
        capacity: current.capacity,
        isPublished: true,
      });
      summary.published.set += 1;
    }
  }

  // Se consulta antes de publicar: reintentar un envío repetido no cambia filas, pero sí consumiría
  // un valor de AUTOINCREMENT, y la repetición del seed no debe tocar nada.
  const knownIds = knownClientMessageIds(chat);
  for (const [index, [author, text]] of MESSAGE_TEXTS.entries()) {
    const clientMessageId = demoMessageId(index + 1);
    if (knownIds.has(clientMessageId)) {
      summary.messages.kept += 1;
      continue;
    }
    chat.postMessage(principals.get(author), { clientMessageId, text });
    summary.messages.created += 1;
  }
  return summary;
}

function printSummary(config, summary) {
  console.log(`Base sembrada: ${config.databaseFile}`);
  console.log(`Cuentas: ${summary.users.created} creadas, ${summary.users.kept} conservadas (${DEMO_USERS.map((u) => u.email).join(', ')}).`);
  console.log('Contraseña: la de SEED_DEMO_PASSWORD (no se muestra).');
  console.log(`Ofertas: ${summary.offers.created} creadas, ${summary.offers.kept} conservadas; fotos nuevas: ${summary.photos.set}; publicaciones nuevas: ${summary.published.set}.`);
  console.log(`Mensajes de chat: ${summary.messages.created} creados, ${summary.messages.kept} conservados.`);
  if (summary.offers.expired.length) {
    console.log(`AVISO: ${summary.offers.expired.length} oferta(s) ya vencieron y no se tocaron (siguen sin aparecer en el catálogo):`);
    for (const title of summary.offers.expired) console.log(`- ${title}`);
    console.log('Para fechas nuevas usa una base nueva (DATABASE_FILE distinto) o edita la fecha en /panel/ofertas.');
  }
}

async function main() {
  const config = loadConfig();
  if (config.appEnv === 'production') {
    throw new Error('seed:demo no se ejecuta con APP_ENV=production.');
  }
  if (config.databaseFile === ':memory:') {
    throw new Error('seed:demo necesita un archivo de base de datos, no :memory:.');
  }
  if (!config.seedDemoPassword) throw new Error('SEED_DEMO_PASSWORD es obligatoria para seed:demo.');
  const container = createContainer(config);
  try {
    printSummary(config, await seedDemo({ container, password: config.seedDemoPassword }));
  } finally {
    container.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Sembrado de demostración fallido: ${error.message}`);
    process.exitCode = 1;
  });
}
