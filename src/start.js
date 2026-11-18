import console from 'node:console';
import process from 'node:process';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createContainer } from './container.js';
import { createHttpServer } from './server.js';

// config → base y migraciones (dentro del contenedor) → app → servidor HTTP + Socket.IO.
async function start() {
  const config = loadConfig();
  const container = await createContainer(config);
  const { httpServer, io } = createHttpServer(createApp(container), container);

  let closing = false;
  function close() {
    if (closing) return;
    closing = true;
    io.close(() => { void container.close(); });
  }

  httpServer.once('error', (error) => {
    console.error(`No se pudo iniciar el servidor: ${error.code ?? 'ERROR'}.`);
    process.exitCode = 1;
    close();
  });

  httpServer.listen(config.port, config.bindHost, () => {
    console.log(`Servidor de turismo comunitario en el puerto ${config.port}.`);
  });

  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
