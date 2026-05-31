const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getUsers,
  getUserById
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate, validateUserId } = require('../middleware/inputValidation');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, validate('updateProfile'), updateProfile);
router.get('/', protect, getUsers);
router.get('/:id', protect, validateUserId, getUserById);

module.exports = router;
