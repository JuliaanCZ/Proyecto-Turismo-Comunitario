# Turismo comunitario

Proyecto académico para una PYME que coordina experiencias de turismo comunitario. La entrega del primer bimestre es un monolito con cuentas, gestión de ofertas turísticas con foto, catálogo con contacto por WhatsApp y chat en tiempo real. El MVP se planificó con Node.js, Express, EJS, JavaScript, Socket.IO y SQLite.

## Primer bimestre

- [Plan del MVP](mvp-primer-bimestre/PLAN-MVP.md). Alcance, rúbrica, arquitectura y reparto del trabajo.
- [Prompts de implementación](mvp-primer-bimestre/PLAN-PROMPTS.md). Un prompt por bloque, con dependencias, responsable, revisor y pruebas.
- [Reparto y secuencia en Excel](mvp-primer-bimestre/Reparto-y-secuencia-MVP.xlsx). Vista por integrante y orden de arranque.
- [Encargo de planificación](mvp-primer-bimestre/PROMPT-MVP.md). Instrucciones usadas para preparar el plan y los prompts.

## Ejecutar la base del monolito

Usa la versión de Node.js indicada en `.nvmrc` (rama 24 LTS) y npm. Desde la raíz del repositorio:

```powershell
npm ci
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
npm start
```

En Bash, el paso equivalente para crear `.env` es `test -f .env || cp .env.example .env`. El ejemplo contiene valores ficticios para desarrollo. Configura secretos propios y HTTPS antes del despliegue. Si aún no tienes un número comercial autorizado para la demo, deja `WHATSAPP_BOOKING_NUMBER` vacío.

Con el servidor en marcha, abre `http://localhost:3000/salud`. Debe responder `{"status":"ok"}`. En otra terminal, comprueba el transporte del mismo servidor con `node scripts/check-ws.js http://localhost:3000`. Ajusta ambas URLs si cambias el puerto.

SQLite se usa mediante `node:sqlite`, integrado en Node, así que `npm ci` no compila nada para la base de datos. Comprueba SQLite en memoria y Argon2 con `node scripts/check-sqlite-argon2.js`.

`npm start` ahora monta la aplicación completa (`createContainer` y `createApp`): abre `./data/app.sqlite`, aplica las migraciones pendientes y sirve la portada en `http://localhost:3000/`, con Socket.IO en el mismo puerto. Fuera de producción, `http://localhost:3000/dev/diseno` muestra los componentes de la [guía visual](docs/mvp/diseno-visual.md). `node scripts/check-contraste.js` verifica el contraste de la paleta. Las cuentas, las ofertas y el chat se implementan en sus propios bloques; sus servicios lanzan `NOT_IMPLEMENTED` hasta entonces y Socket.IO aún no autentica (B1.6).

Ejecuta `npm test` para las pruebas automatizadas y `npm run lint` para revisar el JavaScript. La [evidencia de B0.1](docs/mvp/evidencias/B0.1/) guarda los resultados de la comprobación. Los siguientes bloques se toman en el orden de sus dependencias y se integran mediante PR.

## Plan general de referencia

El [índice de la planificación anterior](docs/planificacion/00-indice-y-control.md) reúne los 13 documentos del diseño ampliado. Los [archivos de referencia](docs/planificacion/referencias/) incluyen el [plan original](docs/planificacion/referencias/PLAN.md), sus prompts y las notas sobre PayPal. Sirven para orientar la evolución posterior del producto. Para implementar el primer bimestre, usa los bloques del plan del MVP.
