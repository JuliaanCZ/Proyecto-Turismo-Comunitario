import { PAGE_SIZE } from '../domain/pagination.js';

const PRIVATE = `o.id, o.title, o.description, o.province, o.location_text,
  o.starts_at, o.capacity, o.contact_phone, o.contact_email, o.is_published, o.created_at, o.updated_at,
  (p.offer_id IS NOT NULL) AS has_photo`;
const PUBLIC = `o.id, o.title, o.description, o.province, o.location_text,
  o.starts_at, o.capacity, o.contact_phone, o.contact_email, o.created_at, o.updated_at, true AS is_published,
  true AS has_photo`;
function publicFilter(now, filters) {
  const args = [now];
  const bind = (value) => { args.push(value); return '$' + args.length; };
  const where = [VISIBLE];
  if (filters.provincia) where.push('o.province=' + bind(filters.provincia));
  else if (filters.region) where.push('o.province IN (' + filters.region.provinces.map(bind).join(',') + ')');
  if (filters.q) {
    const pattern = bind('%' + filters.q + '%');
    where.push('(o.title ILIKE ' + pattern + ' OR o.description ILIKE ' + pattern + ' OR o.location_text ILIKE ' + pattern + ')');
  }
  if (filters.desde) where.push('o.starts_at >= ' + bind(Date.parse(filters.desde + 'T00:00:00-05:00')));
  if (filters.hasta) where.push('o.starts_at < ' + bind(Date.parse(filters.hasta + 'T00:00:00-05:00') + 86_400_000));
  if (filters.cupo > 1) where.push('o.capacity >= ' + bind(filters.cupo));
  return { args, where: where.join(' AND '), bind };
}
const VISIBLE = 'o.is_published = true AND o.starts_at > $1';

export function privateListSql(byProvince) {
  const filter = byProvince ? ' AND o.province = $2' : '';
  const limit = byProvince ? '$3 OFFSET $4' : '$2 OFFSET $3';
  return `SELECT ${PRIVATE} FROM offers o LEFT JOIN offer_photos p ON p.offer_id = o.id AND p.position = 1
    WHERE o.owner_id = $1${filter}
    ORDER BY o.starts_at ASC, o.id ASC LIMIT ${limit}`;
}

export function createOffersRepo(db) {
  return {
    async lock(id, ownerId) {
      return (await db.query('SELECT id FROM offers WHERE id=$1 AND owner_id=$2 FOR UPDATE', [id, ownerId])).rows.length > 0;
    },
    async photos(id) {
      return (await db.query('SELECT * FROM offer_photos WHERE offer_id=$1 ORDER BY position', [id])).rows;
    },
    async clearPhotos(id) {
      await db.query('DELETE FROM offer_photos WHERE offer_id=$1', [id]);
    },
    transaction: (fn) => db.transaction(fn),
    async create(ownerId, v, now) {
      const result = await db.query(`INSERT INTO offers
        (owner_id, title, description, province, location_text, starts_at,
         capacity, is_published, created_at, updated_at, contact_phone, contact_email)
        VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$8,$9,$10) RETURNING id`,
      [ownerId, v.title, v.description, v.province, v.locationText, v.startsAt, v.capacity, now, v.contactPhone, v.contactEmail]);
      return Number(result.rows[0].id);
    },
    async own(id, ownerId) {
      const result = await db.query(`SELECT ${PRIVATE} FROM offers o
        LEFT JOIN offer_photos p ON p.offer_id = o.id AND p.position = 1 WHERE o.id = $1 AND o.owner_id = $2`, [id, ownerId]);
      return result.rows[0] ?? null;
    },
    async privateList(ownerId, province, page) {
      const args = province ? [ownerId, province, PAGE_SIZE, (page - 1) * PAGE_SIZE]
        : [ownerId, PAGE_SIZE, (page - 1) * PAGE_SIZE];
      return (await db.query(privateListSql(Boolean(province)), args)).rows;
    },
    async privateCount(ownerId, province) {
      const sql = province ? 'SELECT count(*) AS total FROM offers WHERE owner_id = $1 AND province = $2'
        : 'SELECT count(*) AS total FROM offers WHERE owner_id = $1';
      return Number((await db.query(sql, province ? [ownerId, province] : [ownerId])).rows[0].total);
    },
    async publicCount(now, filters) {
      const { args, where } = publicFilter(now, filters);
      return Number((await db.query(`SELECT count(*) AS total FROM offers o
        JOIN offer_photos p ON p.offer_id=o.id AND p.position=1 WHERE ${where}`, args)).rows[0].total);
    },
    async publicList(now, page, filters) {
      const { args, where, bind } = publicFilter(now, filters);
      const order = filters.orden === 'cupo' ? 'o.capacity DESC, ' : '';
      const limit = bind(PAGE_SIZE);
      const offset = bind((page - 1) * PAGE_SIZE);
      return (await db.query(`SELECT ${PUBLIC} FROM offers o
        JOIN offer_photos p ON p.offer_id=o.id AND p.position=1 WHERE ${where}
        ORDER BY ${order}o.starts_at ASC, o.id ASC LIMIT ${limit} OFFSET ${offset}`, args)).rows;
    },
    async update(id, ownerId, v, published, now) {
      await db.query(`UPDATE offers SET title=$1, description=$2, province=$3,
        location_text=$4, starts_at=$5, capacity=$6, is_published=$7, updated_at=$8, contact_phone=$11, contact_email=$12
        WHERE id=$9 AND owner_id=$10`,
      [v.title, v.description, v.province, v.locationText, v.startsAt, v.capacity, published, now, id, ownerId, v.contactPhone, v.contactEmail]);
    },
    async remove(id, ownerId) {
      return db.query('DELETE FROM offers WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    },
    async setPhoto(id, photo, position = 1) {
      await db.query(`INSERT INTO offer_photos
        (offer_id, storage_path, content_type, alt_text, size_bytes, position)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (offer_id, position) DO UPDATE SET
        storage_path=excluded.storage_path, content_type=excluded.content_type,
        alt_text=excluded.alt_text, size_bytes=excluded.size_bytes`,
      [id, photo.storagePath, photo.contentType, photo.altText, photo.sizeBytes, position]);
    },
    async ownPhoto(id, ownerId, position = 1) {
      const result = await db.query(`SELECT p.storage_path, p.content_type, p.alt_text, p.size_bytes
        FROM offer_photos p JOIN offers o ON o.id = p.offer_id
        WHERE p.offer_id=$1 AND o.owner_id=$2 AND p.position=$3`, [id, ownerId, position]);
      return result.rows[0] ?? null;
    },
    async nextOwn(ownerId, now) {
      const result = await db.query(`SELECT ${PRIVATE} FROM offers o
        JOIN offer_photos p ON p.offer_id=o.id AND p.position=1
        WHERE o.owner_id=$2 AND ${VISIBLE} ORDER BY o.starts_at, o.id LIMIT 1`, [now, ownerId]);
      return result.rows[0] ?? null;
    },
    async publicOffer(id, now) {
      const result = await db.query(`SELECT ${PUBLIC}, u.display_name AS organizer_name FROM offers o
        JOIN users u ON u.id=o.owner_id
        JOIN offer_photos p ON p.offer_id=o.id AND p.position=1 WHERE o.id=$2 AND ${VISIBLE}`, [now, id]);
      return result.rows[0] ?? null;
    },
    async publicPhoto(id, now, position = 1) {
      const result = await db.query(`SELECT p.storage_path, p.content_type, p.alt_text, p.size_bytes
        FROM offer_photos p JOIN offers o ON o.id = p.offer_id
        WHERE o.id=$1 AND o.is_published=true AND o.starts_at>$2 AND p.position=$3`, [id, now, position]);
      return result.rows[0] ?? null;
    },
  };
}
