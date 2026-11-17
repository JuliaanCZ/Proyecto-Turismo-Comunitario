// Límites de módulos (PLAN-MVP §2.2) y reglas de seguridad de navegador (§2.5, XSS).
// `no-restricted-imports` no se combina entre bloques: el último que coincide reemplaza al anterior,
// así que cada bloque arma su lista completa con `restrictions()`.

const MODULES = ['accounts', 'offers', 'chat'];

const SQLITE = {
  name: 'node:sqlite',
  message: 'Solo src/shared/db.js abre SQLite; los demás reciben `db` inyectado y la usan desde modules/*/data.',
};

// Rutas de paquete que ningún módulo de negocio puede importar.
const FRAMEWORK_PATHS = [
  { name: 'express', message: 'modules/** no conoce Express: eso es del adaptador src/web.' },
  { name: 'socket.io', message: 'modules/** no conoce Socket.IO: eso es del adaptador src/realtime.' },
  { name: 'ejs', message: 'modules/** no conoce EJS: las vistas son de src/web.' },
];

const ADAPTER_PATTERNS = [
  { group: ['**/web/**'], message: 'modules/** no importa src/web: el adaptador HTTP depende de los módulos, no al revés.' },
  { group: ['**/realtime/**'], message: 'modules/** no importa src/realtime: el adaptador Socket.IO depende de los módulos, no al revés.' },
];

function restrictions({ paths = [], patterns = [] } = {}) {
  return ['error', { paths: [SQLITE, ...paths], patterns }];
}

// Un módulo importa a otro solo por su index.js.
function otherModulesOnlyByIndex(own) {
  return MODULES.filter((name) => name !== own).map((other) => ({
    group: [`**/${other}/**`, `!**/${other}/index.js`],
    message: `Un módulo importa a otro solo por su index.js (${other}/index.js).`,
  }));
}

export default [
  { ignores: ['coverage/**', 'data/**'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      eqeqeq: 'error',
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': 'error',
      'no-undef': 'error',
    },
  },
  // SQLite solo se abre en src/shared/db.js (B0.2); en el resto de src se prohíbe importarlo.
  {
    files: ['src/**/*.js'],
    ignores: ['src/shared/db.js'],
    rules: { 'no-restricted-imports': restrictions() },
  },
  // Adaptadores: usan los módulos por su index.js (o, mejor, por el contenedor), nunca por data/service/domain.
  {
    files: ['src/web/**/*.js', 'src/realtime/**/*.js'],
    rules: {
      'no-restricted-imports': restrictions({
        patterns: [{
          group: ['**/modules/*/*/**'],
          message: 'Los adaptadores usan el servicio del contenedor o modules/<nombre>/index.js, no sus carpetas internas.',
        }],
      }),
    },
  },
  // Módulos: sin Express, Socket.IO, EJS, src/web ni src/realtime, y a otros módulos solo por index.js.
  ...MODULES.map((own) => ({
    files: [`src/modules/${own}/**/*.js`],
    rules: {
      'no-restricted-imports': restrictions({
        paths: FRAMEWORK_PATHS,
        patterns: [...ADAPTER_PATTERNS, ...otherModulesOnlyByIndex(own)],
      }),
    },
  })),
  // JavaScript de navegador: globales propias y nada de HTML construido con datos (XSS).
  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        FormData: 'readonly',
        CSS: 'readonly',
        fetch: 'readonly',
        io: 'readonly',
        crypto: 'readonly',
        sessionStorage: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
    rules: {
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Usa textContent: innerHTML abre la puerta a XSS.' },
        { property: 'outerHTML', message: 'Usa textContent o crea nodos con createElement.' },
        { property: 'insertAdjacentHTML', message: 'Usa textContent o crea nodos con createElement.' },
        { object: 'document', property: 'write', message: 'document.write no se usa.' },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
];
