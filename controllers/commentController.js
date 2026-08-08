const Comment = require('../models/Comment');

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
      return res.status(400).json({
        error: 'Maoni hayawezi kuzidi herufi 500',
      });
    }

    const comment = await Comment.create({
      teachingId,
      userId,
      content: content.trim(),
    });

    const fullComment = await Comment.findById(comment.id);

    res.status(201).json(fullComment || comment);
  } catch (err) {
    console.error('Error in addComment:', err);
    res.status(500).json({
      error: 'Imeshindwa kuongeza maoni',
    });
  }
};

/**
 * @desc    Pata maoni yote ya fundisho
 * @route   GET /api/teachings/:teachingId/comments
 * @access  Public
 */
exports.getCommentsByTeaching = async (req, res) => {
  try {
    const { teachingId } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(
      parseInt(req.query.limit) || 50,
      100
    );

    const comments = await Comment.findByTeachingId(
      teachingId,
      page,
      limit,
      req.query.sort || 'newest'
    );

    res.json(comments);
  } catch (err) {
    console.error('Error in getCommentsByTeaching:', err);
    res.status(500).json({
      error: 'Imeshindwa kupata maoni',
    });
  }
};

/**
 * @desc    Futa maoni
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
      return res.status(404).json({
        error: 'Maoni hayapatikani',
      });
    }

    if (
      comment.user_id !== userId &&
      userRole !== 'admin'
    ) {
      return res.status(403).json({
        error: 'Huna ruhusa ya kufuta maoni haya',
      });
    }

    const deleted = await Comment.deleteById(
      commentId,
      userId,
      userRole === 'admin'
    );

    if (!deleted) {
      return res.status(404).json({
        error: 'Maoni hayapatikani',
      });
    }

    res.json({
      message: 'Maoni yamefutwa kikamilifu',
    });
  } catch (err) {
    console.error('Error in deleteComment:', err);
    res.status(500).json({
      error: 'Imeshindwa kufuta maoni',
    });
  }
};

/**
 * @desc    Badilisha maoni
 * @route   PUT /api/comments/:commentId
 * @access  Private
 */
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        error: 'Maoni yanahitajika',
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        error: 'Maoni hayawezi kuzidi herufi 500',
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        error: 'Maoni hayapatikani',
      });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({
        error:
          'Unaweza tu kubadilisha maoni yako mwenyewe',
      });
    }

    const updated = await Comment.updateById(
      commentId,
      content.trim()
    );

    if (!updated) {
      return res.status(404).json({
        error: 'Maoni hayapatikani',
      });
    }

    const updatedComment = await Comment.findById(
      commentId
    );

    res.json(updatedComment);
  } catch (err) {
    console.error('Error in updateComment:', err);
    res.status(500).json({
      error: 'Imeshindwa kubadilisha maoni',
    });
  }
};
exports.replyToComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Reply inahitajika' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Reply haiwezi kuzidi herufi 500' });
    }

    const parent = await Comment.findById(commentId);
    if (!parent) return res.status(404).json({ error: 'Comment haipatikani' });

    const reply = await Comment.create({
      teachingId: parent.teaching_id,
      userId: req.user.id,
      content: content.trim(),
      parentId: commentId,
    });

    const fullReply = await Comment.findById(reply.id);
    return res.status(201).json(fullReply || reply);
  } catch (err) {
    console.error('Error in replyToComment:', err);
    return res.status(500).json({ error: 'Imeshindwa kuongeza reply' });
  }
};

exports.toggleCommentLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment haipatikani' });

    const liked = await Comment.toggleLike(commentId, req.user.id);
    return res.json({ liked });
  } catch (err) {
    console.error('Error in toggleCommentLike:', err);
    return res.status(500).json({ error: 'Imeshindwa kulike comment' });
  }
};

exports.pinComment = async (req, res) => {
  try {
    const updated = await Comment.setPinned(req.params.commentId, true);
    if (!updated) return res.status(404).json({ error: 'Comment haipatikani' });
    return res.json(await Comment.findById(req.params.commentId));
  } catch (err) {
    console.error('Error in pinComment:', err);
    return res.status(500).json({ error: 'Imeshindwa kupin comment' });
  }
};

exports.unpinComment = async (req, res) => {
  try {
    const updated = await Comment.setPinned(req.params.commentId, false);
    if (!updated) return res.status(404).json({ error: 'Comment haipatikani' });
    return res.json(await Comment.findById(req.params.commentId));
  } catch (err) {
    console.error('Error in unpinComment:', err);
    return res.status(500).json({ error: 'Imeshindwa ku-unpin comment' });
  }
};
