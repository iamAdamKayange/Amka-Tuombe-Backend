const express = require('express');
const {
  getAllTeachings,
  getTeachingById,
  createTeaching,
  toggleLike,
  updateTeaching,
  deleteTeaching,
  getTeachingDownload,
} = require('../controllers/teachingController');
const {
  addComment,
  deleteComment,
  updateComment,
  getCommentsByTeaching,
  replyToComment,
  toggleCommentLike,
  pinComment,
  unpinComment,
} = require('../controllers/commentController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();

router.get('/', getAllTeachings);
router.get('/:id/download', getTeachingDownload);
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
router.post('/comments/:commentId/replies', auth, replyToComment);
router.post('/comments/:commentId/like', auth, toggleCommentLike);
router.post('/comments/:commentId/pin', auth, admin, pinComment);
router.post('/comments/:commentId/unpin', auth, admin, unpinComment);

module.exports = router;

