const Teaching = require('../models/Teaching');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const Notification = require('../models/Notification');
const { validateTeaching } = require('../middleware/validate');
const { deleteFile, extractCloudinaryPublicId } = require('../services/cloudinaryService');
const { deleteObject, extractR2Key } = require('../services/r2Service');
const { emitMediaChanged } = require('../services/realtimeService');

exports.getAllTeachings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(Math.max(requestedLimit, 1), 50);

    const offset = (page - 1) * limit;

    const teachings = await Teaching.findAll(limit, offset);

    res.json(teachings);
  } catch (err) {
    console.error('❌ getAllTeachings error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getTeachingById = async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);

    if (!teaching) {
      return res.status(404).json({
        error: 'Teaching not found',
      });
    }

    const comments = await Comment.findByTeachingId(
      req.params.id,
      1,
      50,
    );

    res.json({
      ...teaching,
      comments,
    });
  } catch (err) {
    console.error('❌ getTeachingById error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createTeaching = async (req, res) => {
  try {
    const { error } = validateTeaching(req.body);

    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
      });
    }

    const teaching = await Teaching.create({
      ...req.body,
      createdBy: req.user.id,
    });

    await Notification.create({
      type: 'video',
      title: 'Video mpya imewekwa',
      body: teaching.title,
      url: teaching.url || teaching.video_url || null,
      mediaId: teaching.id,
      dedupeKey: `video:${teaching.id}`,
    }).catch((error) => console.error('Create video notification error:', error.message));

    emitMediaChanged('created', 'video', teaching);
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

    const exists = await Like.exists(
      teachingId,
      userId,
    );

    if (exists) {
      await Like.delete(
        teachingId,
        userId,
      );

      await Teaching.decrementLikes(
        teachingId,
      );

      return res.json({
        liked: false,
      });
    }

    await Like.create(
      teachingId,
      userId,
    );

    await Teaching.incrementLikes(
      teachingId,
    );

    return res.json({
      liked: true,
    });
  } catch (err) {
    console.error('❌ toggleLike error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        error: 'Comment content required',
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        error: 'Comment cannot exceed 500 characters',
      });
    }

    const comment = await Comment.create({
      teachingId: req.params.id,
      userId: req.user.id,
      content: content.trim(),
    });

    const fullComment = await Comment.findById(
      comment.id,
    );

    res.status(201).json(
      fullComment || comment,
    );
  } catch (err) {
    console.error('❌ addComment error:', err);
    res.status(500).json({
      error: 'Failed to add comment',
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const isAdmin =
      req.user.role === 'admin';

    const deleted =
      await Comment.deleteById(
        req.params.commentId,
        req.user.id,
        isAdmin,
      );

    if (!deleted) {
      return res.status(404).json({
        error:
          'Comment not found or not yours',
      });
    }

    res.json({
      message: 'Comment deleted',
    });
  } catch (err) {
    console.error('❌ deleteComment error:', err);
    res.status(500).json({
      error: 'Failed to delete comment',
    });
  }
};

exports.updateTeaching = async (req, res) => {
  try {
    const current = await Teaching.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Teaching not found' });

    const title = req.body.title?.trim();
    const description = req.body.description?.trim() ?? '';
    if (!title || title.length < 3 || title.length > 100) {
      return res.status(400).json({ error: 'Title must be 3 to 100 characters' });
    }
    if (description.length > 500) {
      return res.status(400).json({ error: 'Description cannot exceed 500 characters' });
    }

    const teaching = await Teaching.update(req.params.id, {
      title,
      description,
      thumbnail: req.body.thumbnail ?? current.thumbnail,
      duration: req.body.duration ?? current.duration,
    });
    emitMediaChanged('updated', 'video', teaching);
    return res.json(teaching);
  } catch (err) {
    console.error('Update teaching error:', err);
    return res.status(500).json({ error: 'Failed to update teaching' });
  }
};

exports.deleteTeaching = async (req, res) => {
  try {
    const teaching = await Teaching.deleteById(req.params.id);
    if (!teaching) return res.status(404).json({ error: 'Teaching not found' });

    const r2Key = extractR2Key(teaching.cloudinary_public_id) ||
      extractR2Key(teaching.url || teaching.video_url);
    if (r2Key) {
      await deleteObject(r2Key);
    } else {
      const publicId = teaching.cloudinary_public_id ||
        extractCloudinaryPublicId(teaching.url || teaching.video_url);
      if (publicId) await deleteFile(publicId);
    }

    emitMediaChanged('deleted', 'video', { id: teaching.id });
    return res.json({ message: 'Video deleted', id: teaching.id });
  } catch (err) {
    console.error('Delete teaching error:', err);
    return res.status(500).json({ error: 'Failed to delete teaching' });
  }
};
