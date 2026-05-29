const Comment = require('../models/Comment');

/**
 * @desc    Ongeza maoni kwenye fundisho
 * @route   POST /api/teachings/:teachingId/comments
 * @access  Private (Inahitaji authentication)
 */
exports.addComment = async (req, res) => {
  try {
    const { teachingId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // Kutoka middleware ya auth

    // Validate input
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Maoni yanahitajika' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Maoni hayawezi kuzidi herufi 500' });
    }

    // Create comment
    const comment = await Comment.create({
      teachingId,
      userId,
      content: content.trim()
    });

    // Get full comment with user details
    const fullComment = await Comment.findById(comment.id);

    res.status(201).json(fullComment);
  } catch (err) {
    console.error('Error in addComment:', err);
    res.status(500).json({ error: 'Imeshindwa kuongeza maoni' });
  }
};

/**
 * @desc    Pata maoni yote ya fundisho fulani
 * @route   GET /api/teachings/:teachingId/comments
 * @access  Public
 */
exports.getCommentsByTeaching = async (req, res) => {
  try {
    const { teachingId } = req.params;
    const comments = await Comment.findByTeachingId(teachingId);
    res.json(comments);
  } catch (err) {
    console.error('Error in getCommentsByTeaching:', err);
    res.status(500).json({ error: 'Imeshindwa kupata maoni' });
  }
};

/**
 * @desc    Futa maoni (mmiliki au admin pekee)
 * @route   DELETE /api/teachings/comments/:commentId
 * @access  Private (Inahitaji authentication)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // First, get the comment to check ownership
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Maoni haupatikani' });
    }

    // Allow if user is comment owner OR admin
    if (comment.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Huna ruhusa ya kufuta maoni haya' });
    }

    const deleted = await Comment.deleteById(commentId, userId, userRole === 'admin');
    if (!deleted) {
      return res.status(404).json({ error: 'Maoni haupatikani' });
    }

    res.json({ message: 'Maoni yamefutwa kikamilifu' });
  } catch (err) {
    console.error('Error in deleteComment:', err);
    res.status(500).json({ error: 'Imeshindwa kufuta maoni' });
  }
};

/**
 * @desc    Badilisha maoni (mmiliki pekee)
 * @route   PUT /api/teachings/comments/:commentId
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
    res.json(updatedComment);
  } catch (err) {
    console.error('Error in updateComment:', err);
    res.status(500).json({ error: 'Imeshindwa kubadilisha maoni' });
  }
};