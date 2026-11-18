import console from 'node:console';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';
import { DEMO_ACCOUNT, loadConfig } from '../src/config.js';
import { createContainer } from '../src/container.js';
import { toEcuadorLocalDateTime } from '../src/shared/time.js';

const ASSETS = fileURLToPath(new URL('../public/img/', import.meta.url));
const DAY_MS = 86_400_000;

// Estos datos se usan solo al ejecutar el comando de carga. El sitio lee el catálogo de PostgreSQL.
const OFFERS = [
  {
    title: 'Caminata al borde del Quilotoa', province: 'COTOPAXI', locationText: 'Comunidad Quilotoa, Pujilí',
    capacity: 18, days: 7, time: '08:00', file: 'sierra.jpg', altText: 'Laguna del Quilotoa vista desde el cráter',
    description: 'Recorre el borde de la laguna con una guía de la comunidad y conoce el paisaje del páramo.',
  },
  {
    title: 'Senderos y costa en Los Frailes', province: 'MANABI', locationText: 'Ingreso al sendero de Los Frailes, Machalilla',
    capacity: 12, days: 10, time: '09:00', file: 'costa.jpg', altText: 'Playa de Los Frailes vista desde el mirador',
    description: 'Explora senderos del bosque seco y miradores costeros con interpretación del entorno.',
  },
  {
    title: 'Saberes y senderos junto al río Napo', province: 'NAPO', locationText: 'Puerto Misahuallí, Tena',
    capacity: 10, days: 14, time: '08:30', file: 'amazonia.jpg', altText: 'Río Napo rodeado de bosque cerca de Puerto Misahuallí',
    description: 'Camina junto al río e intercambia saberes sobre la selva y las plantas de la comunidad.',
  },
  {
    title: 'Caminata interpretativa en Bahía Tortuga', province: 'GALAPAGOS', locationText: 'Entrada al sendero de Bahía Tortuga, Santa Cruz',
    capacity: 8, days: 18, time: '07:45', file: 'galapagos.jpg', altText: 'Playa de Bahía Tortuga en la isla Santa Cruz',
    description: 'Sigue un sendero de la isla con una guía local y observa el paisaje costero y su fauna.',
  },
];

async function ensureDemoAccount(accounts, password) {
  try {
    await accounts.registerUser({ ...DEMO_ACCOUNT, password, passwordConfirm: password });
  } catch (error) {
    if (error?.code !== 'EMAIL_TAKEN') throw error;
  }
  try {
    return await accounts.authenticate(DEMO_ACCOUNT.email, password);
  } catch (error) {
    if (error?.code !== 'INVALID_CREDENTIALS') throw error;
    throw new Error('La contraseña configurada no coincide con la cuenta existente de Ana.', { cause: error });
  }
}

async function listOwnByTitle(offers, principal) {
  const items = new Map();
  for (let page = 1; ; page += 1) {
    const result = await offers.listOffers(principal, { pagina: page });
    for (const item of result.items) items.set(item.title, item);
    if (page >= result.totalPages) return items;
  }
}

export async function seedDemo({ container, password }) {
  if (!password || password.length < 10) throw new Error('SEED_DEMO_PASSWORD debe tener al menos 10 caracteres.');
  const { accounts, offers, clock } = container;
  const principal = await ensureDemoAccount(accounts, password);
  const existing = await listOwnByTitle(offers, principal);
  const now = clock.now();
  const summary = { created: 0, kept: 0, published: 0 };

  for (const { days, time, file, altText, ...definition } of OFFERS) {
    const startsAt = toEcuadorLocalDateTime(now + days * DAY_MS).slice(0, 10) + 'T' + time;
    let offer = existing.get(definition.title);
    if (!offer) {
      offer = await offers.createOffer(principal, {
        ...definition, startsAt, contactPhone: '+12025550101', contactEmail: DEMO_ACCOUNT.email,
        description: definition.description + ' Experiencia ficticia de demostración.',
      });
      summary.created += 1;
    } else {
      summary.kept += 1;
    }
    if (!offer.hasPhoto) {
      const source = await readFile(resolve(ASSETS, file));
      const imageBytes = await sharp(source).resize(1200, 800, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer();
      offer = await offers.setOfferPhoto(principal, offer.id, { contentType: 'image/jpeg', altText, imageBytes });
    }
    if (!offer.isPublished && offer.startsAt > now) {
      await offers.updateOffer(principal, offer.id, { ...offer, startsAt: offer.startsAtLocal, isPublished: true });
      summary.published += 1;
    }
  }
  return summary;
}

async function main() {
  const config = loadConfig();
  if (config.appEnv !== 'development') throw new Error('Ejecuta seed:demo en el proyecto Supabase de desarrollo.');
  if (!config.seedDemoPassword) throw new Error('Configura SEED_DEMO_PASSWORD para seed:demo.');
  const container = await createContainer(config);
  try {
    const { created, kept, published } = await seedDemo({ container, password: config.seedDemoPassword });
    console.log(`Ofertas de ${DEMO_ACCOUNT.email}: ${created} nuevas, ${kept} conservadas, ${published} publicadas.`);
  } finally {
    await container.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Carga de demostración fallida: ${error.message}`);
    process.exitCode = 1;
  });
}
