import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';

const EXTENSIONS = Object.freeze({
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
});

export function createPhotoStorage({ supabaseUrl, supabaseServiceRoleKey, supabaseBucket = 'site-imgs' }) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias para las fotos.');
  }
  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const bucket = client.storage.from(supabaseBucket);
  return {
    async ensureBucket() {
      const options = { public: false, fileSizeLimit: 50_000_000,
        allowedMimeTypes: Object.keys(EXTENSIONS) };
      const { data, error } = await client.storage.getBucket(supabaseBucket);
      if (error && error.statusCode !== '404') throw new Error(`No se pudo consultar el bucket: ${error.message}`);
      const result = data
        ? await client.storage.updateBucket(supabaseBucket, options)
        : await client.storage.createBucket(supabaseBucket, options);
      if (result.error) throw new Error(`No se pudo configurar el bucket: ${result.error.message}`);
    },
    async upload(offerId, { imageBytes, contentType }) {
      const ext = EXTENSIONS[contentType];
      if (!ext) throw new TypeError('Formato de imagen no permitido.');
      const path = `offers/${offerId}/${randomUUID()}.${ext}`;
      const { error } = await bucket.upload(path, imageBytes, {
        contentType, upsert: false, cacheControl: '0',
      });
      if (error) throw new Error(`No se pudo subir la imagen a Supabase Storage: ${error.message}`);
      return path;
    },
    async download(path) {
      const { data, error } = await bucket.download(path);
      if (error) throw new Error(`No se pudo leer la imagen de Supabase Storage: ${error.message}`);
      return Buffer.from(await data.arrayBuffer());
    },
    async remove(path) {
      const { error } = await bucket.remove([path]);
      if (error) throw new Error(`No se pudo eliminar la imagen de Supabase Storage: ${error.message}`);
    },
  };
}
