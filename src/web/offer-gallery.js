import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import Busboy from 'busboy';
import { AppError } from '../shared/errors.js';
import { processOfferPhoto } from './offer-photo.js';

function invalid(message) {
  return AppError.fromCatalog('VALIDATION_ERROR', message, { fieldErrors: { photos: [message] } });
}

function collect(req, folder, fields) {
  return new Promise((resolve, reject) => {
    let parser;
    try {
      parser = Busboy({ headers: req.headers, limits: {
        files: 5, fileSize: 50_000_000, fields: 23, fieldSize: 12_000, parts: 30,
      } });
    } catch {
      reject(invalid('El formulario de fotos no es válido.'));
      return;
    }
    const files = new Map();
    const writes = [];
    let problem;
    const abort = () => parser.destroy(invalid('La carga quedó incompleta.'));
    req.once('aborted', abort);
    parser.on('field', (name, value, info) => {
      if (info.valueTruncated || Object.hasOwn(fields, name)) problem = invalid('Revisa los campos del formulario.');
      else fields[name] = value;
    });
    parser.on('file', (name, stream, { mimeType }) => {
      if (!/^photo[1-5]$/.test(name) || files.has(name)) {
        problem = invalid('Selecciona hasta cinco fotos.');
        stream.resume();
        return;
      }
      const path = join(folder, name);
      files.set(name, { path, mimeType });
      stream.on('limit', () => { problem = invalid('Cada foto admite hasta 50 MB.'); });
      writes.push(pipeline(stream, createWriteStream(path)).catch((error) => { problem ??= error; }));
    });
    for (const event of ['filesLimit', 'fieldsLimit', 'partsLimit']) {
      parser.on(event, () => { problem = invalid('El formulario excede el límite de campos o fotos.'); });
    }
    parser.on('error', (error) => { problem ??= error; });
    parser.on('close', async () => {
      await Promise.all(writes);
      req.removeListener('aborted', abort);
      if (problem) reject(problem);
      else resolve(files);
    });
    req.pipe(parser);
  });
}

export async function withOfferGallery(req, fields, save) {
  const folder = await mkdtemp(join(tmpdir(), 'kawsay-offer-'));
  try {
    const files = await collect(req, folder, fields);
    const keep = [1, 2, 3, 4, 5].filter((position) => fields['keep' + position] === 'on');
    const additions = [...files.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([name, { path, mimeType }]) => async () => processOfferPhoto({
        bytes: await readFile(path), mimeType, altText: fields['alt' + name.slice(-1)],
      }));
    return await save({ keep, additions });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
