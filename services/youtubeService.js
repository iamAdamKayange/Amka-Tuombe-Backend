const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// unaweza kutumia @handle au channel name
const CHANNEL_HANDLE = 'mwalimuayubuwillymwafyela5284';

/**
 * Step 1: Get Channel ID using search API (supports @handles)
 */
async function getChannelId() {
  try {
    const res = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          q: CHANNEL_HANDLE,
          type: 'channel',
          maxResults: 1,
          key: YOUTUBE_API_KEY
        }
      }
    );

    const channelId = res.data.items?.[0]?.snippet?.channelId;
    return channelId || null;
  } catch (err) {
    console.error(
      'YouTube Channel Search Error:',
      err.response?.data || err.message
    );
    return null;
  }
}

/**
 * Step 2: Get uploads playlist from channelId (OFFICIAL WAY)
 */
async function getUploadsPlaylistId(channelId) {
  try {
    const res = await axios.get(
      'https://www.googleapis.com/youtube/v3/channels',
      {
        params: {
          part: 'contentDetails',
          id: channelId,
          key: YOUTUBE_API_KEY
        }
      }
    );

    return res.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null;
  } catch (err) {
    console.error(
      'YouTube Playlist Error:',
      err.response?.data || err.message
    );
    return null;
  }
}

/**
 * Step 3: Get videos from uploads playlist
 */
async function getChannelVideos(maxResults = 30) {
  try {
    const channelId = await getChannelId();
    if (!channelId) throw new Error('Channel ID not found');

    const playlistId = await getUploadsPlaylistId(channelId);
    if (!playlistId) throw new Error('Uploads playlist not found');

    const playlistRes = await axios.get(
      'https://www.googleapis.com/youtube/v3/playlistItems',
      {
        params: {
          part: 'snippet',
          playlistId,
          maxResults,
          key: YOUTUBE_API_KEY
        }
      }
    );

    const videos = (playlistRes.data.items || []).map((item) => ({
      title: item.snippet.title,
      description: item.snippet.description,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      thumbnail: item.snippet.thumbnails?.high?.url || null,
      date: item.snippet.publishedAt?.split('T')[0] || null,
      duration: 'N/A',
      videoId: item.snippet.resourceId.videoId
    }));

    return videos;
  } catch (error) {
    console.error(
      'YouTube API Error:',
      error.response?.data || error.message
    );
    return [];
  }
}

module.exports = { getChannelVideos };