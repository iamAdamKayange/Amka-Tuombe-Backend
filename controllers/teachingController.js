const Teaching = require('../models/Teaching');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const { validateTeaching } = require('../middleware/validate');
const { getCachedOrFetch, invalidatePattern } = require('../utils/cache');

exports.getAllTeachings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const cacheKey = `teachings:page:${page}:limit:${limit}`;

    const teachings = await getCachedOrFetch(cacheKey, async () => {
      const offset = (page - 1) * limit;
      return await Teaching.findAll(limit, offset);
    }, 300);

    res.json(teachings);
  } catch (err) {
    console.error('❌ getAllTeachings error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getTeachingById = async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) return res.status(404).json({ error: 'Teaching not found' });

    // Optional: cache comments separately if needed
    const comments = await Comment.findByTeachingId(req.params.id, 1, 50);
    res.json({ ...teaching, comments });
  } catch (err) {
    console.error('❌ getTeachingById error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createTeaching = async (req, res) => {
  try {
    const { error } = validateTeaching(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const teaching = await Teaching.create({
      ...req.body,
      createdBy: req.user.id,
    });

    await invalidatePattern('teachings:*'); // Clear cache for all teachings
    res.status(201).json(teaching);
  } catch (err) {
    console.error('❌ createTeaching error:', err);
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
      return res.json({ liked: false });
    } else {
      await Like.create(teachingId, userId);
      await Teaching.incrementLikes(teachingId);
      return res.json({ liked: true });
    }
  } catch (err) {
    console.error('❌ toggleLike error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 👇 Make sure this matches the route: POST /api/teachings/:id/comments
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content required' });
    }
    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment cannot exceed 500 characters' });
    }

    const comment = await Comment.create({
      teachingId: req.params.id,
      userId: req.user.id,
      content: content.trim(),
    });

    // Return full comment with user details (optional)
    const fullComment = await Comment.findById(comment.id);
    res.status(201).json(fullComment || comment);
  } catch (err) {
    console.error('❌ addComment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// 👇 Make sure route is DELETE /api/teachings/comments/:commentId
exports.deleteComment = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const deleted = await Comment.deleteById(req.params.commentId, req.user.id, isAdmin);
    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found or not yours' });
    }
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('❌ deleteComment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};