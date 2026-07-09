const Notification = require('../models/Notification');
const {
  emitLiveChanged,
  emitNotificationChanged,
} = require('./realtimeService');
const youtubeService = require('./youtubeService');

let timer = null;
let running = false;

async function checkYoutubeLive() {
  if (running) return;
  running = true;

  try {
    const youtubeLive = await youtubeService.getCurrentLive();
    if (!youtubeLive) return;

    const videoId = youtubeLive.videoId || youtubeLive.id || youtubeLive.title;
    const notification = await Notification.create({
      type: 'live',
      title: 'Live imeanza',
      body: youtubeLive.title || 'Mwl. Ayubu Mwafyela yuko live sasa',
      url: youtubeLive.streamUrl || youtubeLive.stream_url || youtubeLive.url || null,
      mediaId: youtubeLive.videoId || youtubeLive.id || null,
      dedupeKey: `live:${videoId}`,
    }).catch((error) => {
      console.error('Create monitored YouTube live notification error:', error.message);
      return null;
    });

    if (notification) {
      emitNotificationChanged('created', notification);
      emitLiveChanged('started', youtubeLive);
    }
  } catch (error) {
    console.error('YouTube live monitor error:', error.message);
  } finally {
    running = false;
  }
}

function startLiveMonitor() {
  if (timer) return;

  const intervalMs = Math.max(
    Number(process.env.LIVE_MONITOR_INTERVAL_MS) || 60_000,
    30_000,
  );

  checkYoutubeLive();
  timer = setInterval(checkYoutubeLive, intervalMs);
  if (timer.unref) timer.unref();
}

function stopLiveMonitor() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = {
  startLiveMonitor,
  stopLiveMonitor,
  checkYoutubeLive,
};
