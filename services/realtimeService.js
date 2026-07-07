let io;

function initRealtime(socketServer) {
  io = socketServer;

  io.on('connection', (socket) => {
    socket.emit('connected', { ok: true });
  });
}

function emitMediaChanged(action, mediaType, item) {
  if (!io) return;

  io.emit('media:changed', {
    action,
    mediaType,
    id: item?.id ?? null,
    item: item ?? null,
    at: new Date().toISOString(),
  });
}

module.exports = {
  initRealtime,
  emitMediaChanged,
};
