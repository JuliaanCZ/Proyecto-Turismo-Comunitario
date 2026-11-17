// Contador de mensajes nuevos (B1.10) asociado a la cuenta que lo generó.
// `chatNuevos` conserva su forma (un entero en `sessionStorage`) porque `chat.js` (B1.7) lo borra con
// `removeItem('chatNuevos')` al abrir el chat. El dueño va en otra clave, `chatNuevosUsuario`, con el
// identificador numérico del usuario (el mismo `userId` que ya imprime la sala del chat): no es secreto
// y NO es el token ni el identificador de la sesión.
//
// Si el dueño guardado no coincide con la cuenta de la página, el contador no es de esta cuenta y se
// reinicia. Esto cubre: otra cuenta que ingresa en la misma pestaña tras «Salir» y el valor heredado
// de versiones anteriores, que tenía contador pero ningún dueño.

export const COUNT_KEY = 'chatNuevos';
export const OWNER_KEY = 'chatNuevosUsuario';

/**
 * @param {Storage | undefined} storage `sessionStorage` (puede faltar o lanzar: se usa memoria).
 * @param {number | string} userId identificador numérico del usuario autenticado.
 */
export function createUnreadCounter(storage, userId) {
  const owner = String(userId);
  let memoryCount = 0;
  let memoryOwner = null;
  let useMemory = false;

  const get = (key) => {
    if (useMemory) return key === COUNT_KEY ? String(memoryCount) : memoryOwner;
    try {
      return storage.getItem(key);
    } catch {
      useMemory = true;
      return get(key);
    }
  };
  const set = (key, value) => {
    if (!useMemory) {
      try {
        storage.setItem(key, value);
        return;
      } catch {
        useMemory = true;
      }
    }
    if (key === COUNT_KEY) memoryCount = Number(value);
    else memoryOwner = value;
  };
  const remove = (key) => {
    if (!useMemory) {
      try {
        storage.removeItem(key);
        return;
      } catch {
        useMemory = true;
      }
    }
    if (key === COUNT_KEY) memoryCount = 0;
    else memoryOwner = null;
  };

  const isMine = () => get(OWNER_KEY) === owner;

  // Al cargar la página: si el contador no es de esta cuenta, se descarta y se reclama el dueño.
  const claim = () => {
    if (isMine()) return;
    remove(COUNT_KEY);
    set(OWNER_KEY, owner);
  };
  claim();

  const read = () => {
    if (!isMine()) return 0;
    const value = Number(get(COUNT_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  };

  return {
    read,
    increment() {
      claim();
      const next = read() + 1;
      set(COUNT_KEY, String(next));
      return next;
    },
  };
}
