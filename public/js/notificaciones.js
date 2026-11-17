// Aviso de nuevo mensaje (B1.10). Se carga en las pantallas con sesión salvo `/panel/chat`.
// Abre su propio socket SIN unirse a `chat:general` (así el servidor sabe que el usuario está fuera
// de la sala) y muestra «N mensajes nuevos» en `#chat-badge` (contrato con `header.ejs`, B1.9).
// El contador vive en `sessionStorage['chatNuevos']`; `chat.js` (B1.7) lo borra al abrir el chat.

const STORAGE_KEY = 'chatNuevos';

const badge = document.querySelector('#chat-badge');
// Defensa adicional: en la pantalla del chat no se avisa (ya llega `chat:message`).
const onChatScreen = Boolean(document.querySelector('#chat-form'));

if (badge && !onChatScreen && typeof io === 'function') {
  let memoryCount = 0;

  const readCount = () => {
    try {
      const value = Number(sessionStorage.getItem(STORAGE_KEY));
      return Number.isSafeInteger(value) && value > 0 ? value : 0;
    } catch {
      return memoryCount;
    }
  };

  const writeCount = (value) => {
    memoryCount = value;
    try {
      sessionStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Sin almacenamiento de sesión el contador solo vive en esta página.
    }
  };

  // La insignia es la región `aria-live`. No se oculta con `hidden`/`display: none` (un lector de
  // pantalla no anuncia un cambio dentro de un elemento fuera del árbol de accesibilidad): sin avisos
  // queda vacía y recortada con `.sr-only`, y con avisos muestra el texto.
  badge.setAttribute('aria-live', 'polite');
  badge.setAttribute('aria-atomic', 'true');
  badge.hidden = false;

  const render = () => {
    const count = readCount();
    badge.classList.toggle('sr-only', count === 0);
    badge.textContent = count === 0
      ? ''
      : `${count} ${count === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}`;
  };

  render();

  // Al volver con «Atrás» desde la caché de páginas, el DOM puede estar desfasado respecto al contador.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) render();
  });

  const socket = io({ transports: ['websocket'] });

  socket.on('notification:new-message', (notice) => {
    if (!Number.isSafeInteger(notice?.messageId)) return;
    writeCount(readCount() + 1);
    render();
  });
}
