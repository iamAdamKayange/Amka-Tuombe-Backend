const Comment = require('../models/Comment');
const { invalidatePattern } = require('../utils/cache'); // Optional: for cache invalidation

/**
 * @desc    Ongeza maoni kwenye fundisho
 * @route   POST /api/teachings/:teachingId/comments
 * @access  Private
 */
exports.addComment = async (req, res) => {
  try {
    const { teachingId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Maoni yanahitajika' });
    }
    if (content.length > 500) {
      return res.status(400).json({ error: 'Maoni hayawezi kuzidi herufi 500' });
    }

    const comment = await Comment.create({
      teachingId,
      userId,
      content: content.trim(),
    });

    const fullComment = await Comment.findById(comment.id);

    // Optional: Invalidate cache for this teaching's details
    await invalidatePattern(`teaching:${teachingId}:*`);

    res.status(201).json(fullComment);
  } catch (err) {
    console.error('Error in addComment:', err);
    res.status(500).json({ error: 'Imeshindwa kuongeza maoni' });
  }
};

/**
 * @desc    Pata maoni yote ya fundisho (paged)
 * @route   GET /api/teachings/:teachingId/comments
 * @access  Public
 */
exports.getCommentsByTeaching = async (req, res) => {
  try {
    const { teachingId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page

    const comments = await Comment.findByTeachingId(teachingId, page, limit);
    res.json(comments);
  } catch (err) {
    console.error('Error in getCommentsByTeaching:', err);
    res.status(500).json({ error: 'Imeshindwa kupata maoni' });
  }
};

/**
 * @desc    Futa maoni (mmiliki au admin pekee)
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Maoni haupatikani' });
    }

    if (comment.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Huna ruhusa ya kufuta maoni haya' });
    }

    const deleted = await Comment.deleteById(commentId, userId, userRole === 'admin');
    if (!deleted) {
      return res.status(404).json({ error: 'Maoni haupatikani' });
    }

    // Optional: Invalidate cache for the teaching's details
    await invalidatePattern(`teaching:${comment.teaching_id}:*`);

    res.json({ message: 'Maoni yamefutwa kikamilifu' });
  } catch (err) {
    console.error('Error in deleteComment:', err);
    res.status(500).json({ error: 'Imeshindwa kufuta maoni' });
  }
};

/**
 * @desc    Badilisha maoni (mmiliki pekee)
 * @route   PUT /api/comments/:commentId
 * @access  Private
 */
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Maoni yanahitajika' });
    }
    if (content.length > 500) {
      return res.status(400).json({ error: 'Maoni hayawezi kuzidi herufi 500' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Maoni haupatikani' });
    }
    if (comment.user_id !== userId) {
      return res.status(403).json({ error: 'Unaweza tu kubadilisha maoni yako mwenyewe' });
    }

    const updated = await Comment.updateById(commentId, content.trim());
    if (!updated) {
      return res.status(404).json({ error: 'Maoni haupatikani' });
    }

    const updatedComment = await Comment.findById(commentId);

    // Optional: Invalidate cache for the teaching's details
    await invalidatePattern(`teaching:${comment.teaching_id}:*`);

    res.json(updatedComment);
  } catch (err) {
    console.error('Error in updateComment:', err);
    res.status(500).json({ error: 'Imeshindwa kubadilisha maoni' });
  }
};