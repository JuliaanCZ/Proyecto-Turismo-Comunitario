import console from 'node:console';
import process from 'node:process';
import { loadConfig } from './src/config.js';
import { createBaseApp, createHttpServer } from './src/server.js';

function start() {
  const config = loadConfig();
  const { httpServer, io } = createHttpServer(createBaseApp());

  httpServer.once('error', (error) => {
    console.error(`No se pudo iniciar el servidor: ${error.code ?? 'ERROR'}.`);
    process.exitCode = 1;
    void io.close();
  });

  httpServer.listen(config.port, () => {
    console.log(`Servidor de turismo comunitario en el puerto ${config.port}.`);
  });

  let closing = false;
  function close() {
    if (closing) return;
    closing = true;
    void io.close();
  }

  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

try {
  start();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
