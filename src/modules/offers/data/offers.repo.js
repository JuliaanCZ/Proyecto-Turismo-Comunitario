import { withTransaction } from '../../../shared/db.js';

// Las proyecciones excluyen siempre image_bytes y, en el catálogo, owner_id.
const PRIVATE = `o.id, o.title, o.description, o.province, o.location_text,
  o.starts_at, o.capacity, o.is_published, o.created_at, o.updated_at,
  EXISTS (SELECT 1 FROM offer_photos p WHERE p.offer_id = o.id) AS has_photo`;
const PUBLIC = `o.id, o.title, o.description, o.province, o.location_text,
  o.starts_at, o.capacity, o.created_at, o.updated_at, 1 AS is_published,
  1 AS has_photo`;
const VISIBLE = `o.is_published = 1 AND o.starts_at > ?
  AND EXISTS (SELECT 1 FROM offer_photos p WHERE p.offer_id = o.id)`;

export function createOffersRepo(db) {
  const insert = db.prepare(`INSERT INTO offers
    (owner_id, title, description, province, location_text, starts_at,
     capacity, is_published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`);
  const own = db.prepare(`SELECT ${PRIVATE} FROM offers o WHERE o.id = ? AND o.owner_id = ?`);
  const update = db.prepare(`UPDATE offers SET title = ?, description = ?, province = ?,
    location_text = ?, starts_at = ?, capacity = ?, is_published = ?, updated_at = ?
    WHERE id = ? AND owner_id = ?`);
  const remove = db.prepare('DELETE FROM offers WHERE id = ? AND owner_id = ?');
  const setPublished = db.prepare('UPDATE offers SET is_published = ?, updated_at = ? WHERE id = ? AND owner_id = ?');
  const upsertPhoto = db.prepare(`INSERT INTO offer_photos (offer_id, content_type, alt_text, image_bytes)
    VALUES (?, ?, ?, ?) ON CONFLICT(offer_id) DO UPDATE SET
    content_type = excluded.content_type, alt_text = excluded.alt_text,
    image_bytes = excluded.image_bytes`);
  const photoOwn = db.prepare(`SELECT p.content_type, p.alt_text, p.image_bytes
    FROM offer_photos p JOIN offers o ON o.id = p.offer_id
    WHERE p.offer_id = ? AND o.owner_id = ?`);
  const pub = db.prepare(`SELECT ${PUBLIC} FROM offers o WHERE o.id = ? AND ${VISIBLE}`);
  const pubPhoto = db.prepare(`SELECT p.content_type, p.alt_text, p.image_bytes
    FROM offer_photos p JOIN offers o ON o.id = p.offer_id
    WHERE o.id = ? AND o.is_published = 1 AND o.starts_at > ?`);

  function privateList(ownerId, province, page) {
    const filter = province ? ' AND o.province = ?' : '';
    const count = db.prepare(`SELECT count(*) AS total FROM offers o WHERE o.owner_id = ?${filter}`);
    const list = db.prepare(`SELECT ${PRIVATE} FROM offers o WHERE o.owner_id = ?${filter}
      ORDER BY o.starts_at ASC, o.id ASC LIMIT ? OFFSET ?`);
    const args = province ? [ownerId, province] : [ownerId];
    return { total: count.get(...args).total, items: list.all(...args, 10, (page - 1) * 10) };
  }
  function privateCount(ownerId, province) {
    const filter = province ? ' AND province = ?' : '';
    return db.prepare(`SELECT count(*) AS total FROM offers WHERE owner_id = ?${filter}`)
      .get(...(province ? [ownerId, province] : [ownerId])).total;
  }
  function publicCount(now) {
    return db.prepare(`SELECT count(*) AS total FROM offers o WHERE ${VISIBLE}`).get(now).total;
  }
  function publicList(now, page) {
    return db.prepare(`SELECT ${PUBLIC} FROM offers o WHERE ${VISIBLE}
      ORDER BY o.starts_at ASC, o.id ASC LIMIT ? OFFSET ?`)
      .all(now, 10, (page - 1) * 10);
  }
  return {
    transaction: (fn) => withTransaction(db, fn),
    create(ownerId, v, now) {
      return Number(insert.run(ownerId, v.title, v.description, v.province,
        v.locationText, v.startsAt, v.capacity, now, now).lastInsertRowid);
    },
    own: (id, ownerId) => own.get(id, ownerId),
    privateList, privateCount, publicCount, publicList,
    update: (id, ownerId, v, published, now) => update.run(v.title, v.description,
      v.province, v.locationText, v.startsAt, v.capacity, published ? 1 : 0, now, id, ownerId),
    remove: (id, ownerId) => remove.run(id, ownerId),
    publish: (id, ownerId, published, now) => setPublished.run(published ? 1 : 0, now, id, ownerId),
    setPhoto: (id, photo) => upsertPhoto.run(id, photo.contentType, photo.altText, photo.imageBytes),
    ownPhoto: (id, ownerId) => photoOwn.get(id, ownerId),
    publicOffer: (id, now) => pub.get(id, now),
    publicPhoto: (id, now) => pubPhoto.get(id, now),
  };
}
