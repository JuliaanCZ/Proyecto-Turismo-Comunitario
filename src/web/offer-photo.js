import { Buffer } from 'node:buffer';
import Busboy from 'busboy';
import sharp from 'sharp';
import { AppError } from '../shared/errors.js';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_PIXELS = 12_000_000;
const MIME = new Map([['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]);

function invalid(field, message) {
  return AppError.fromCatalog('VALIDATION_ERROR', 'Revisa la foto indicada.', {
    fieldErrors: { [field]: [message] },
  });
}

function readMultipart(req) {
  return new Promise((resolve, reject) => {
    let parser;
    try {
      parser = Busboy({ headers: req.headers,
        limits: { files: 1, fields: 1, parts: 3, fileSize: MAX_BYTES, fieldSize: 512 } });
    } catch {
      reject(invalid('imageBytes', 'Envía una foto en un formulario válido.'));
      return;
    }
    let file = null;
    let altText = '';
    let problem = null;
    parser.on('file', (name, stream, info) => {
      if (name !== 'foto' || file) problem = invalid('imageBytes', 'Envía una sola foto.');
      const chunks = [];
      let size = 0;
      stream.on('data', (chunk) => {
        size += chunk.length;
        if (size <= MAX_BYTES) chunks.push(chunk);
      });
      stream.on('limit', () => { problem = invalid('imageBytes', 'La foto no puede superar 2 MiB.'); });
      stream.on('end', () => { file = { bytes: Buffer.concat(chunks), mimeType: info.mimeType }; });
    });
    parser.on('field', (name, value, info) => {
      if (name !== 'altText' || info.valueTruncated) {
        problem = invalid('altText', 'El texto alternativo no es válido.');
      } else altText = value;
    });
    parser.on('filesLimit', () => { problem = invalid('imageBytes', 'Envía una sola foto.'); });
    parser.on('fieldsLimit', () => { problem = invalid('altText', 'Envía un solo texto alternativo.'); });
    parser.on('partsLimit', () => { problem = invalid('imageBytes', 'El formulario tiene demasiadas partes.'); });
    parser.on('error', () => reject(invalid('imageBytes', 'No pudimos leer la foto.')));
    parser.on('close', () => {
      if (problem) reject(problem);
      else if (!file?.bytes.length) reject(invalid('imageBytes', 'Selecciona una foto.'));
      else resolve({ ...file, altText });
    });
    req.pipe(parser);
  });
}

export async function validatedOfferPhoto(req) {
  const { bytes, mimeType, altText } = await readMultipart(req);
  if (![...MIME.values()].includes(mimeType)) {
    throw invalid('imageBytes', 'La foto debe ser JPEG, PNG o WebP.');
  }
  let metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata();
  } catch {
    throw invalid('imageBytes', 'La foto está dañada o supera 12 megapíxeles.');
  }
  const contentType = MIME.get(metadata.format);
  if (!contentType || contentType !== mimeType || (metadata.pages ?? 1) !== 1 ||
      !metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS) {
    throw invalid('imageBytes', 'El contenido de la foto no coincide con su formato o es demasiado grande.');
  }
  let imageBytes;
  try {
    const pipeline = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).rotate();
    if (metadata.format === 'jpeg') imageBytes = await pipeline.jpeg({ quality: 85 }).toBuffer();
    else if (metadata.format === 'webp') imageBytes = await pipeline.webp({ quality: 85 }).toBuffer();
    else imageBytes = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  } catch {
    throw invalid('imageBytes', 'No pudimos procesar la foto.');
  }
  if (imageBytes.length > MAX_BYTES) throw invalid('imageBytes', 'La foto procesada supera 2 MiB.');
  return { contentType, imageBytes, altText };
}
