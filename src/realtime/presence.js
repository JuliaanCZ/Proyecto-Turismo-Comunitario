const CHAT_ROOM = 'chat:general';

export function createPresence(io) {
  const socketsByUser = new Map();
  const userBySocket = new WeakMap();

  function snapshot() {
    const users = [...socketsByUser.entries()]
      .map(([id, sockets]) => {
        const socket = sockets.values().next().value;
        return { id, displayName: socket.data.principal.displayName };
      })
      .sort((left, right) => left.id - right.id);
    return { users, count: users.length };
  }

  function publish() {
    const presence = snapshot();
    io.to(CHAT_ROOM).emit('presence:update', presence);
    return presence;
  }

  return {
    join(socket) {
      const userId = socket.data.principal.userId;
      let sockets = socketsByUser.get(userId);
      const wasAbsent = !sockets;
      if (!sockets) {
        sockets = new Set();
        socketsByUser.set(userId, sockets);
      }
      if (sockets.has(socket)) return snapshot();
      sockets.add(socket);
      userBySocket.set(socket, userId);
      return wasAbsent ? publish() : snapshot();
    },

    leave(socket) {
      const userId = userBySocket.get(socket);
      if (userId === undefined) return snapshot();
      userBySocket.delete(socket);
      const sockets = socketsByUser.get(userId);
      sockets?.delete(socket);
      if (sockets?.size) return snapshot();
      socketsByUser.delete(userId);
      return publish();
    },

    snapshot,
  };
}
