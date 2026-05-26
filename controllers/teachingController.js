const Teaching = require('../models/Teaching');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const { validateTeaching } = require('../middleware/validate');
const { getChannelVideos } = require('../services/youtubeService');

// Helper to sync YouTube videos to database
async function syncYouTubeVideos() {
    try {
        const videos = await getChannelVideos(30);
        for (const video of videos) {
            const exists = await Teaching.findByUrl(video.url);
            if (!exists) {
                await Teaching.create({
                    title: video.title,
                    description: video.description,
                    url: video.url,
                    thumbnail: video.thumbnail,
                    date: video.date,
                    duration: video.duration,
                    createdBy: null // au admin ID
                });
            }
        }
        console.log('✅ YouTube videos synced');
    } catch (err) {
        console.error('❌ Sync error:', err.message);
    }
}

exports.getAllTeachings = async (req, res) => {
    try {
        // Sync with YouTube (consider moving to a cron job later)
        await syncYouTubeVideos();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const teachings = await Teaching.findAll(limit, offset);
        res.json(teachings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.getTeachingById = async (req, res) => {
    try {
        const teaching = await Teaching.findById(req.params.id);
        if (!teaching) return res.status(404).json({ error: 'Teaching not found' });
        const comments = await Comment.findByTeachingId(req.params.id);
        res.json({ ...teaching, comments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.createTeaching = async (req, res) => {
    try {
        const { error } = validateTeaching(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const teaching = await Teaching.create({
            ...req.body,
            createdBy: req.user.id
        });
        res.status(201).json(teaching);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const teachingId = req.params.id;
        const userId = req.user.id;
        const exists = await Like.exists(teachingId, userId);
        if (exists) {
            await Like.delete(teachingId, userId);
            await Teaching.decrementLikes(teachingId);
            res.json({ liked: false });
        } else {
            await Like.create(teachingId, userId);
            await Teaching.incrementLikes(teachingId);
            res.json({ liked: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Comment content required' });
        }
        const comment = await Comment.create({
            teachingId: req.params.id,
            userId: req.user.id,
            content
        });
        res.status(201).json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const deleted = await Comment.deleteById(req.params.commentId, req.user.id);
        if (!deleted) return res.status(404).json({ error: 'Comment not found or not yours' });
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};