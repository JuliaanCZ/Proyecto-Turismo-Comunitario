import assert from 'node:assert/strict';
import test from 'node:test';
import { COUNT_KEY, OWNER_KEY, createUnreadCounter } from '../../public/js/notificaciones-contador.js';

// B1.10 — el contador `chatNuevos` pertenece a la cuenta que lo generó. Regresión: tras «Salir», otra
// cuenta que ingresaba en la misma pestaña veía el número de la anterior.

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
  };
}

const LUIS = 7;
const ANA = 3;

test('contador: la clave chatNuevos sigue siendo un entero simple y el dueño va aparte', () => {
  const storage = fakeStorage();
  const luis = createUnreadCounter(storage, LUIS);
  assert.equal(luis.read(), 0);
  luis.increment();
  luis.increment();
  assert.equal(storage.getItem(COUNT_KEY), '2');
  assert.equal(storage.getItem(OWNER_KEY), String(LUIS));
  assert.deepEqual([...storage.data.keys()].sort(), [COUNT_KEY, OWNER_KEY].sort());
  assert.equal(luis.read(), 2);
});

test('contador: Luis acumula, sale y Ana en la misma pestaña empieza en cero', () => {
  const storage = fakeStorage();
  const luis = createUnreadCounter(storage, LUIS);
  luis.increment();
  luis.increment();
  assert.equal(luis.read(), 2);

  const ana = createUnreadCounter(storage, ANA); // otra página, misma pestaña (mismo sessionStorage)
  assert.equal(ana.read(), 0, 'Ana no hereda el contador de Luis');
  assert.equal(storage.getItem(COUNT_KEY), null, 'el valor de Luis se descartó');
  assert.equal(storage.getItem(OWNER_KEY), String(ANA));
  assert.equal(ana.increment(), 1);

  const luisDeNuevo = createUnreadCounter(storage, LUIS);
  assert.equal(luisDeNuevo.read(), 0, 'y Luis tampoco hereda el de Ana');
});

test('contador: navegar dentro de la misma cuenta conserva el valor', () => {
  const storage = fakeStorage();
  createUnreadCounter(storage, LUIS).increment();
  createUnreadCounter(storage, LUIS).increment();
  const otraPantalla = createUnreadCounter(storage, LUIS);
  assert.equal(otraPantalla.read(), 2);
  assert.equal(otraPantalla.increment(), 3);
});

test('contador: almacenamiento existente sin dueño (versión anterior) se descarta', () => {
  const storage = fakeStorage({ [COUNT_KEY]: '5' });
  const counter = createUnreadCounter(storage, ANA);
  assert.equal(counter.read(), 0);
  assert.equal(storage.getItem(COUNT_KEY), null);
  assert.equal(storage.getItem(OWNER_KEY), String(ANA));
});

test('contador: abrir el chat borra chatNuevos como hace chat.js y el dueño no resucita el valor', () => {
  const storage = fakeStorage();
  const luis = createUnreadCounter(storage, LUIS);
  luis.increment();
  storage.removeItem(COUNT_KEY); // chat.js: sessionStorage.removeItem('chatNuevos')
  assert.equal(luis.read(), 0);
  assert.equal(createUnreadCounter(storage, LUIS).read(), 0);
  assert.equal(luis.increment(), 1);
});

test('contador: valores inválidos o un dueño ajeno nunca producen un número', () => {
  for (const bad of ['', 'abc', '-1', '0', '1.5', 'NaN', '9007199254740993']) {
    const storage = fakeStorage({ [COUNT_KEY]: bad, [OWNER_KEY]: String(LUIS) });
    assert.equal(createUnreadCounter(storage, LUIS).read(), 0, `«${bad}»`);
  }
  // Una página de Luis que sigue abierta mientras la pestaña ya es de Ana no lee el número de Ana.
  const storage = fakeStorage();
  const luis = createUnreadCounter(storage, LUIS);
  const ana = createUnreadCounter(storage, ANA);
  ana.increment();
  assert.equal(luis.read(), 0);
});

test('contador: sin almacenamiento (ausente o que lanza) cuenta en memoria', () => {
  for (const storage of [undefined, {
    getItem() { throw new Error('bloqueado'); },
    setItem() { throw new Error('bloqueado'); },
    removeItem() { throw new Error('bloqueado'); },
  }]) {
    const counter = createUnreadCounter(storage, LUIS);
    assert.equal(counter.read(), 0);
    counter.increment();
    assert.equal(counter.increment(), 2);
    assert.equal(counter.read(), 2);
  }
});

test('contador: conserva dueño y valor en memoria si puede leer pero no escribir', () => {
  const storage = fakeStorage({ [COUNT_KEY]: '2', [OWNER_KEY]: String(LUIS) });
  storage.setItem = () => { throw new Error('escritura bloqueada'); };
  const counter = createUnreadCounter(storage, LUIS);
  assert.equal(counter.read(), 2);
  assert.equal(counter.increment(), 3);
  assert.equal(counter.read(), 3);
  assert.equal(counter.increment(), 4);
  assert.equal(counter.read(), 4);
  assert.equal(storage.getItem(COUNT_KEY), '2');
});
