const express = require('express');
const {
  getAllTeachings,
  getTeachingById,
  createTeaching,
  toggleLike,
  addComment,
  deleteComment
} = require('../controllers/teachingController');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', getAllTeachings);
router.get('/:id', getTeachingById);
router.post('/', auth, createTeaching);
router.post('/:id/like', auth, toggleLike);
router.post('/:id/comments', auth, addComment);
router.delete('/comments/:commentId', auth, deleteComment);

module.exports = router;