const express = require('express');
const router = express.Router();
const {
  getCategories,
  getProductsByCategory,
} = require('../controllers/categoryController');

// Public routes
// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', getCategories);

// @route   GET /api/categories/:category
// @desc    Get products by category
// @access  Public
router.get('/:category', getProductsByCategory);

module.exports = router;