import console from 'node:console';
import process from 'node:process';
import { URL } from 'node:url';
import { io } from 'socket.io-client';

function checkWebSocket(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('URL inválida');
    }
  } catch {
    console.error('Uso: node scripts/check-ws.js <url-http-o-https>');
    process.exitCode = 2;
    return;
  }

  const origin = url.origin.replace(/^ws/, 'http');
  const socket = io(url.href, {
    transports: ['websocket'],
    extraHeaders: { Origin: origin },
    reconnection: false,
    timeout: 5000,
  });

  socket.once('connect', () => {
    const transport = socket.io.engine.transport.name;
    console.log(`connect · transporte: ${transport}`);
    if (transport !== 'websocket') process.exitCode = 1;
    socket.disconnect();
  });

  socket.once('connect_error', (error) => {
    console.error(`connect_error · código: ${error.data?.code ?? error.code ?? 'CONNECTION_FAILED'}`);
    process.exitCode = 1;
    socket.disconnect();
  });
}

checkWebSocket(process.argv[2]);
