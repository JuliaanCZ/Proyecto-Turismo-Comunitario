export async function joinAndRecover({ readCursor, join, recover }) {
  const cursorBeforeJoin = readCursor();
  const joined = await join();
  await recover(cursorBeforeJoin);
  return joined;
}

export function insertMessageNodeInOrder(list, node, messageId) {
  const insertionPoint = [...list.children].find((child) => {
    const childId = Number(child.dataset.messageId);
    return !Number.isSafeInteger(childId) || childId > messageId;
  });
  list.insertBefore(node, insertionPoint ?? null);
}
