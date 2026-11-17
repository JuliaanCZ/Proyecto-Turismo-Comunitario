import assert from 'node:assert/strict';
import test from 'node:test';
import {
  insertMessageNodeInOrder,
  joinAndRecover,
} from '../../public/js/chat-client.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function messageNode(id) {
  return { dataset: { messageId: id === null ? undefined : String(id) } };
}

function fakeList(ids) {
  return {
    children: ids.map(messageNode),
    insertBefore(node, reference) {
      const index = reference === null ? this.children.length : this.children.indexOf(reference);
      this.children.splice(index, 0, node);
    },
  };
}

function idsOf(list) {
  return list.children.map((node) => (
    node.dataset.messageId === undefined ? null : Number(node.dataset.messageId)
  ));
}

test('TM-CHAT-05 cliente: recupera desde el cursor anterior aunque llegue un mensaje durante chat:join', async () => {
  let lastId = 10;
  const joinAck = deferred();
  const recoveredFrom = [];

  const operation = joinAndRecover({
    readCursor: () => lastId,
    join: () => joinAck.promise,
    recover: async (cursor) => { recoveredFrom.push(cursor); },
  });

  lastId = 12;
  joinAck.resolve({ ok: true, lastMessageId: 12 });
  await operation;

  assert.deepEqual(recoveredFrom, [10]);
});

test('TM-CHAT-05 cliente: intercala por ID un mensaje recuperado anterior al ya visible', () => {
  const list = fakeList([10, 12, null]);

  insertMessageNodeInOrder(list, messageNode(11), 11);
  insertMessageNodeInOrder(list, messageNode(13), 13);

  assert.deepEqual(idsOf(list), [10, 11, 12, 13, null]);
});
