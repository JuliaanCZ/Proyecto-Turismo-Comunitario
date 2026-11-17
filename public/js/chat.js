const list = document.querySelector('#chat-messages');
const empty = document.querySelector('#chat-empty');
const loadBeforeButton = document.querySelector('#chat-load-before');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#chat-text');
const submit = document.querySelector('#chat-submit');
const count = document.querySelector('#chat-count');
const error = document.querySelector('#chat-error');
const connection = document.querySelector('#chat-connection');

const visibleIds = new Set(
  [...list.querySelectorAll('[data-message-id]')].map((node) => Number(node.dataset.messageId)),
);
const currentUserId = Number(list.dataset.currentUserId);
const pending = new Map();
let firstId = Number(list.dataset.firstId) || 0;
let lastId = Number(list.dataset.lastId) || 0;
let recovering = false;
let sessionEnded = false;

sessionStorage.removeItem('chatNuevos');

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guayaquil',
  }).format(new Date(timestamp));
}

function messageNode(message) {
  const item = document.createElement('li');
  item.className = 'chat__mensaje';
  const own = message.author.id === currentUserId;
  if (own) item.classList.add('chat__mensaje--propio');
  item.dataset.messageId = String(message.id);
  item.dataset.clientMessageId = message.clientMessageId;

  const meta = document.createElement('div');
  meta.className = 'chat__mensaje-meta';
  const author = document.createElement('strong');
  author.textContent = message.author.displayName;
  const time = document.createElement('time');
  time.dateTime = new Date(message.createdAt).toISOString();
  time.textContent = formatDate(message.createdAt);
  meta.append(author, time);
  if (own) {
    const state = document.createElement('span');
    state.className = 'chat__estado';
    state.textContent = 'Confirmado';
    meta.append(state);
  }

  const text = document.createElement('p');
  text.textContent = message.text;
  item.append(meta, text);
  return item;
}

function updateBounds(message) {
  firstId = firstId ? Math.min(firstId, message.id) : message.id;
  lastId = Math.max(lastId, message.id);
  list.dataset.firstId = String(firstId);
  list.dataset.lastId = String(lastId);
}

function appendMessage(message) {
  if (visibleIds.has(message.id)) return;
  const ownPending = pending.get(message.clientMessageId);
  if (ownPending) {
    ownPending.node.remove();
    pending.delete(message.clientMessageId);
  }
  visibleIds.add(message.id);
  list.append(messageNode(message));
  updateBounds(message);
  empty.hidden = true;
}

function prependMessages(messages) {
  for (const message of [...messages].reverse()) {
    if (visibleIds.has(message.id)) continue;
    visibleIds.add(message.id);
    list.insertBefore(messageNode(message), list.firstChild);
    updateBounds(message);
  }
  if (messages.length) empty.hidden = true;
}

async function fetchHistory(parameters) {
  const query = new URLSearchParams(parameters);
  const response = await fetch(`/api/chat/mensajes?${query}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('No se pudo recuperar el historial.');
  return response.json();
}

async function recoverAfter(cursor) {
  if (recovering) return;
  recovering = true;
  try {
    let after = cursor;
    let hasMore = true;
    while (hasMore) {
      const history = await fetchHistory({ after: String(after), limit: '100' });
      for (const message of history.messages) appendMessage(message);
      hasMore = history.hasMore;
      const next = history.messages.at(-1)?.id ?? after;
      if (next <= after) break;
      after = next;
    }
  } catch (historyError) {
    connection.textContent = historyError.message;
  } finally {
    recovering = false;
  }
}

function pendingNode(payload) {
  const item = document.createElement('li');
  item.className = 'chat__mensaje chat__mensaje--propio';
  item.dataset.clientMessageId = payload.clientMessageId;
  const meta = document.createElement('div');
  meta.className = 'chat__mensaje-meta';
  const author = document.createElement('strong');
  author.textContent = 'Tú';
  const state = document.createElement('span');
  state.className = 'chat__estado';
  state.textContent = 'Pendiente';
  meta.append(author, state);
  const text = document.createElement('p');
  text.textContent = payload.text;
  const retry = document.createElement('button');
  retry.className = 'btn btn--secundario chat__reintentar';
  retry.type = 'button';
  retry.textContent = 'Reintentar';
  retry.hidden = true;
  item.append(meta, text, retry);
  return { item, state, retry };
}

function failPending(entry, message) {
  entry.state.textContent = 'Fallido';
  entry.retry.hidden = false;
  error.textContent = message;
}

async function sendPayload(payload) {
  let entry = pending.get(payload.clientMessageId);
  if (!entry) {
    const rendered = pendingNode(payload);
    entry = { node: rendered.item, state: rendered.state, retry: rendered.retry, payload };
    rendered.retry.addEventListener('click', () => sendPayload(payload));
    pending.set(payload.clientMessageId, entry);
    list.append(rendered.item);
    empty.hidden = true;
  }
  entry.state.textContent = 'Pendiente';
  entry.retry.hidden = true;
  error.textContent = '';
  try {
    const response = await socket.timeout(5_000).emitWithAck('chat:send', payload);
    if (!response.ok) {
      failPending(entry, response.error.message);
      return;
    }
    appendMessage(response.message);
  } catch {
    failPending(entry, 'No se pudo enviar. Revisa la conexión y vuelve a intentarlo.');
  }
}

const socket = io({ transports: ['websocket'] });

socket.on('connect', async () => {
  connection.textContent = `Conectado por ${socket.io.engine.transport.name}.`;
  submit.disabled = false;
  try {
    const joined = await socket.timeout(5_000).emitWithAck('chat:join');
    if (!joined.ok) throw new Error(joined.error?.message ?? 'No se pudo abrir la sala.');
    await recoverAfter(lastId);
  } catch (joinError) {
    connection.textContent = joinError.message;
  }
});

socket.io.on('reconnect_attempt', () => {
  connection.textContent = 'Reconectando…';
});

socket.on('disconnect', () => {
  if (!sessionEnded) connection.textContent = 'Desconectado. Socket.IO intentará reconectar.';
  submit.disabled = true;
});

socket.on('connect_error', () => {
  connection.textContent = 'No se pudo conectar al chat.';
});

socket.on('session:expired', () => {
  sessionEnded = true;
  connection.textContent = 'Tu sesión terminó. Vuelve a ingresar para continuar.';
  submit.disabled = true;
});

socket.on('chat:message', (message) => {
  const previous = lastId;
  appendMessage(message);
  if (previous && message.id > previous + 1) recoverAfter(previous);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.normalize('NFC').trim();
  if (!text) {
    error.textContent = 'Escribe un mensaje.';
    return;
  }
  if ([...text].length > 500) {
    error.textContent = 'El mensaje admite como máximo 500 caracteres.';
    return;
  }
  const payload = { clientMessageId: crypto.randomUUID(), text };
  input.value = '';
  count.textContent = '0 de 500 caracteres';
  input.focus();
  sendPayload(payload);
});

input.addEventListener('input', () => {
  count.textContent = `${[...input.value].length} de 500 caracteres`;
});

loadBeforeButton.addEventListener('click', async () => {
  if (!firstId) return;
  loadBeforeButton.disabled = true;
  try {
    const history = await fetchHistory({ before: String(firstId), limit: '30' });
    prependMessages(history.messages);
    loadBeforeButton.hidden = !history.hasMore;
  } catch (historyError) {
    error.textContent = historyError.message;
  } finally {
    loadBeforeButton.disabled = false;
  }
});

window.addEventListener('pagehide', () => socket.emit('chat:leave'));
