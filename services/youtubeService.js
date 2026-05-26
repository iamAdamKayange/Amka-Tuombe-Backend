const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_USERNAME = 'mwalimuayubuwillymwafyela5284'; // Jina la channel yako

async function getChannelVideos(maxResults = 30) {
    try {
        // Hatua ya 1: Pata Channel ID kutoka kwa username
        const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'id',
                forUsername: CHANNEL_USERNAME,
                key: YOUTUBE_API_KEY
            }
        });

        const channelId = channelRes.data.items?.[0]?.id;
        if (!channelId) throw new Error('Channel not found');

        // Hatua ya 2: Pata playlist ya video za channel (uploads)
        const playlistRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
            params: {
                part: 'snippet',
                playlistId: `UU${channelId.substring(2)}`, // Kwa uploads playlist
                maxResults: maxResults,
                key: YOUTUBE_API_KEY
            }
        });

        const videos = playlistRes.data.items.map(item => ({
            title: item.snippet.title,
            description: item.snippet.description,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
            thumbnail: item.snippet.thumbnails.high.url,
            date: item.snippet.publishedAt.split('T')[0], // YYYY-MM-DD
            duration: 'N/A', // YouTube API inahitaji call nyingine kwa duration, lakini tumia placeholder
            videoId: item.snippet.resourceId.videoId
        }));

        return videos;
    } catch (error) {
        console.error('YouTube API Error:', error.response?.data || error.message);
        return [];
    }
}

module.exports = { getChannelVideos };