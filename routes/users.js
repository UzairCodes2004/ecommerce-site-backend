const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUserProfile,
  deleteUser,
  promoteToAdmin
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

// All routes are protected and some are admin-only

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', protect, admin, getUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private/Admin
router.get('/:id', protect, admin, getUserById);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateUserProfile);

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, admin, deleteUser);

router.put('/promote-to-admin', protect, admin, promoteToAdmin);
module.exports = router;