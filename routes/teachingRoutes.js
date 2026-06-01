const express = require('express');
const router = express.Router();
const {
  getAllTeachings,
  getTeachingById,
  createTeaching,
  toggleLike,
  addComment,
  deleteComment
} = require('../controllers/teachingController');
const auth = require('../middleware/auth');

router.get('/', getAllTeachings);
router.get('/:id', getTeachingById);
router.post('/', auth, createTeaching);            // YouTube URL
router.post('/:id/like', auth, toggleLike);
router.post('/:id/comments', auth, addComment);
router.delete('/comments/:commentId', auth, deleteComment);

module.exports = router;