const PASSWORD_HASH = '$argon2id$v=19$m=8,t=1,p=1$test$test';

function now(ctx) {
  return ctx.clock.now();
}

export function createUser(ctx, { email, displayName }) {
  const result = ctx.db.prepare(`
    INSERT INTO users (email, display_name, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `).run(email, displayName, PASSWORD_HASH, now(ctx));
  return {
    id: Number(result.lastInsertRowid),
    email,
    displayName,
  };
}

export function createOffer(ctx, ownerId, data = {}) {
  const offer = {
    title: data.title ?? 'Oferta de prueba',
    description: data.description ?? 'Descripción de una oferta válida para pruebas.',
    province: data.province ?? 'PICHINCHA',
    locationText: data.locationText ?? 'Centro comunitario',
    startsAt: data.startsAt ?? now(ctx) + 86_400_000,
    capacity: data.capacity ?? 10,
    isPublished: data.isPublished ?? 0,
  };
  const result = ctx.db.prepare(`
    INSERT INTO offers (
      owner_id, title, description, province, location_text, starts_at,
      capacity, is_published, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ownerId,
    offer.title,
    offer.description,
    offer.province,
    offer.locationText,
    offer.startsAt,
    offer.capacity,
    offer.isPublished,
    now(ctx),
    now(ctx),
  );
  return { id: Number(result.lastInsertRowid), ...offer, ownerId };
}

export function createMessages(ctx, count, { authors } = {}) {
  if (!Array.isArray(authors) || authors.length === 0) {
    throw new TypeError('createMessages requiere al menos un autor.');
  }
  const insert = ctx.db.prepare(`
    INSERT INTO chat_messages (
      room, author_id, author_name, text, client_message_id, created_at
    ) VALUES ('general', ?, ?, ?, ?, ?)
  `);
  const messages = [];
  for (let index = 0; index < count; index += 1) {
    const author = authors[index % authors.length];
    const authorId = typeof author === 'object' ? author.id : author;
    const authorName = typeof author === 'object'
      ? (author.displayName ?? author.display_name)
      : `Usuario ${authorId}`;
    const text = `Mensaje de prueba ${index + 1}`;
    const clientMessageId = `test-message-${index + 1}`;
    const result = insert.run(authorId, authorName, text, clientMessageId, now(ctx));
    messages.push({
      id: Number(result.lastInsertRowid),
      authorId,
      authorName,
      text,
      clientMessageId,
    });
  }
  return messages;
}
