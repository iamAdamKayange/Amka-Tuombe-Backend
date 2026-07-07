const axios = require('axios');

const api = axios.create({
  baseURL: 'https://www.googleapis.com/youtube/v3',
  timeout: 10000,
});

const channelHandle = (
  process.env.YOUTUBE_CHANNEL_HANDLE ||
  'mwalimuayubuwillymwafyela5284'
).replace(/^@/, '');

let cachedChannelId = process.env.YOUTUBE_CHANNEL_ID || null;
let cachedLive = null;
let cacheExpiresAt = 0;
let pendingLookup = null;

function apiKey() {
  return process.env.YOUTUBE_API_KEY;
}

async function resolveChannelId() {
  if (cachedChannelId) return cachedChannelId;
  if (!apiKey()) return null;

  const { data } = await api.get('/channels', {
    params: {
      part: 'id',
      forHandle: channelHandle,
      key: apiKey(),
    },
  });
  cachedChannelId = data.items?.[0]?.id || null;
  return cachedChannelId;
}

function normalizeVideo(item) {
  if (!item?.id) return null;
  const details = item.liveStreamingDetails || {};
  return {
    id: item.id,
    videoId: item.id,
    title: item.snippet?.title || 'Mwalimu Ayubu Mwafyela Live',
    description: item.snippet?.description || '',
    stream_url: `https://www.youtube.com/watch?v=${item.id}`,
    thumbnail:
      item.snippet?.thumbnails?.maxres?.url ||
      item.snippet?.thumbnails?.high?.url ||
      null,
    started_at: details.actualStartTime || details.scheduledStartTime || null,
    concurrent_viewers: Number(details.concurrentViewers || 0),
    source: 'youtube',
  };
}

async function getVideoDetails(videoId) {
  const { data } = await api.get('/videos', {
    params: {
      part: 'snippet,liveStreamingDetails',
      id: videoId,
      key: apiKey(),
    },
  });
  const item = data.items?.[0];
  if (!item || item.liveStreamingDetails?.actualEndTime) return null;
  return normalizeVideo(item);
}

async function searchCurrentLive() {
  const channelId = await resolveChannelId();
  if (!channelId) return null;

  const { data } = await api.get('/search', {
    params: {
      part: 'snippet',
      channelId,
      eventType: 'live',
      type: 'video',
      maxResults: 1,
      key: apiKey(),
    },
  });
  const videoId = data.items?.[0]?.id?.videoId;
  return videoId ? getVideoDetails(videoId) : null;
}

async function searchPublicLivePage() {
  try {
    const response = await axios.get(
      `https://www.youtube.com/@${channelHandle}/live`,
      {
        timeout: 12000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    );
    const html = String(response.data || '');
    if (!html.includes('"isLiveNow":true')) return null;

    const finalUrl = response.request?.res?.responseUrl || '';
    const redirectedId = finalUrl
      ? new URL(finalUrl).searchParams.get('v')
      : null;
    const canonicalId = html.match(
      /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/,
    )?.[1];
    const videoId = redirectedId || canonicalId;
    if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;

    const encodedTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
    return {
      id: videoId,
      videoId,
      title: encodedTitle || 'Mwalimu Ayubu Mwafyela Live',
      description: '',
      stream_url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      started_at: null,
      concurrent_viewers: 0,
      source: 'youtube_page',
    };
  } catch (error) {
    console.error('YouTube public live page lookup failed:', error.message);
    return null;
  }
}

async function lookupCurrentLive() {
  try {
    if (cachedLive?.videoId && apiKey()) {
      cachedLive = await getVideoDetails(cachedLive.videoId);
      cacheExpiresAt = Date.now() + (cachedLive ? 60_000 : 10 * 60_000);
      return cachedLive;
    }

    cachedLive = apiKey()
      ? await searchCurrentLive()
      : await searchPublicLivePage();
    cacheExpiresAt = Date.now() + (cachedLive ? 60_000 : 10 * 60_000);
    return cachedLive;
  } catch (error) {
    console.error('YouTube live lookup failed:', error.response?.data || error.message);
    cachedLive = await searchPublicLivePage();
    cacheExpiresAt = Date.now() + (cachedLive ? 60_000 : 10 * 60_000);
    return cachedLive;
  }
}

async function getCurrentLive() {
  if (Date.now() < cacheExpiresAt) return cachedLive;
  if (!pendingLookup) {
    pendingLookup = lookupCurrentLive().finally(() => {
      pendingLookup = null;
    });
  }
  return pendingLookup;
}

module.exports = { getCurrentLive, resolveChannelId };
