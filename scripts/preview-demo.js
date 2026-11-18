import console from 'node:console';
import process from 'node:process';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createContainer } from '../src/container.js';
import { createHttpServer } from '../src/server.js';
import { createDemoBackend } from './demo-backend.js';
import { DEMO_USERS, seedDemo } from './seed-demo.js';

const port = process.env.KAWSAY_DEMO_PORT ?? '3100';
const config = loadConfig({ APP_ENV: 'development', PORT: port, BIND_HOST: '127.0.0.1',
  APP_ORIGIN: 'http://127.0.0.1:' + port, DEMO_MAILBOX_ENABLED: 'false' });
const { db, storage } = createDemoBackend();
try {
  const container = await createContainer(config, { db, storage, skipMigrate: true });
  await seedDemo({ container, password: config.seedDemoPassword });
  const app = createApp(container);
  app.locals.demoLogin = { accounts: DEMO_USERS, password: config.seedDemoPassword };
  const { httpServer, io } = createHttpServer(app, container);
  httpServer.once('error', async (error) => {
    console.error(error.message);
    process.exitCode = 1;
    await container.close();
    await db.close();
  });
  const close = () => io.close(async () => { await container.close(); await db.close(); });
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  httpServer.listen(config.port, config.bindHost, () => {
    console.log('Demo de Kawsay Ñan: ' + config.appOrigin);
    console.log('Cuentas: ana@demo.test y luis@demo.test. Contraseña: ' + config.seedDemoPassword);
    console.log('Los cambios de esta demo se reinician al cerrar el servidor.');
  });
} catch (error) {
  await db.close();
  throw error;
}
