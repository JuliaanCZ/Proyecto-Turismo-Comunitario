import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';

export function createBaseApp() {
  const app = express();
  app.disable('x-powered-by');
  app.get('/salud', (_req, res) => res.json({ status: 'ok' }));
  app.get('/', (_req, res) => res.type('text').send('Turismo comunitario'));
  return app;
}

export function createHttpServer(app) {
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  return { httpServer, io };
}
