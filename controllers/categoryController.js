const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category');
  res.json(categories);
});

// @desc    Get products by category
// @route   GET /api/categories/:category
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res) => {
  const pageSize = 12;
  const page = Number(req.query.pageNumber) || 1;
  const category = req.params.category;

  const count = await Product.countDocuments({ category });
  const products = await Product.find({ category })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ 
    products, 
    page, 
    pages: Math.ceil(count / pageSize),
    category 
  });
});

module.exports = {
  getCategories,
  getProductsByCategory,
};