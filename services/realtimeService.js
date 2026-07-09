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

function emitLiveChanged(action, item = null) {
  if (!io) return;

  io.emit('live:changed', {
    action,
    id: item?.id ?? null,
    item,
    at: new Date().toISOString(),
  });
}

function emitNotificationChanged(action, item = null) {
  if (!io) return;

  io.emit('notification:changed', {
    action,
    id: item?.id ?? null,
    item,
    at: new Date().toISOString(),
  });
}

function emitPrayerChanged(action, item = null) {
  if (!io) return;

  io.emit('prayer:changed', {
    action,
    id: item?.id ?? null,
    item,
    at: new Date().toISOString(),
  });
}

module.exports = {
  initRealtime,
  emitMediaChanged,
  emitLiveChanged,
  emitNotificationChanged,
  emitPrayerChanged,
};
