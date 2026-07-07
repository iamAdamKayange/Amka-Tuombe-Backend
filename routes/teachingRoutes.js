const express = require('express');
const {
  getAllTeachings,
  getTeachingById,
  createTeaching,
  toggleLike,
  updateTeaching,
  deleteTeaching,
} = require('../controllers/teachingController');
const {
  addComment,
  deleteComment,
  updateComment,      // ikiwa unahitaji
  getCommentsByTeaching,
} = require('../controllers/commentController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();

router.get('/', getAllTeachings);
router.get('/:id', getTeachingById);
router.post('/', auth, admin, createTeaching);
router.patch('/:id', auth, admin, updateTeaching);
router.delete('/:id', auth, admin, deleteTeaching);
router.post('/:id/like', auth, toggleLike);

// Comments routes (sasa zinatoka kwenye commentController)
router.get('/:teachingId/comments', getCommentsByTeaching);
router.post('/:teachingId/comments', auth, addComment);
router.put('/comments/:commentId', auth, updateComment);     // ikiwa unataka
router.delete('/comments/:commentId', auth, deleteComment);

module.exports = router;
