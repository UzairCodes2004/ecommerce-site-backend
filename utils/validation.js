const validator = require("validator");
const mongoose = require("mongoose");

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Validate email format
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

// Validate strong password (min 6 chars, at least 1 number, 1 uppercase, 1 lowercase)
const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  return passwordRegex.test(password);
};

// Validate price (positive number with 2 decimal places)
const isValidPrice = (price) => {
  const priceRegex = /^\d+(\.\d{1,2})?$/;
  return priceRegex.test(price.toString()) && price > 0;
};

// Validate quantity (positive integer)
const isValidQuantity = (quantity) => {
  return Number.isInteger(quantity) && quantity > 0;
};

// Validate URL format (for product images)
const isValidURL = (url) => {
  return validator.isURL(url, {
    protocols: ["http", "https"],
    require_protocol: true,
  });
};

// Validate phone number (basic international format)
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// Validate product data
const validateProduct = (productData) => {
  const errors = [];

  if (!productData.name || productData.name.trim().length < 3) {
    errors.push("Product name must be at least 3 characters long");
  }

  if (!isValidPrice(productData.price)) {
    errors.push("Price must be a positive number with up to 2 decimal places");
  }

  if (!productData.description || productData.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters long");
  }

  if (productData.countInStock < 0) {
    errors.push("Stock quantity cannot be negative");
  }

  return errors;
};

// Validate user registration data
const validateUserRegistration = (userData) => {
  const errors = [];

  if (!userData.name || userData.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (!isValidEmail(userData.email)) {
    errors.push("Please provide a valid email address");
  }

  if (!isValidPassword(userData.password)) {
    errors.push(
      "Password must be at least 6 characters with uppercase, lowercase, and number"
    );
  }

  return errors;
};

module.exports = {
  isValidObjectId,
  isValidEmail,
  isValidPassword,
  isValidPrice,
  isValidQuantity,
  isValidURL,
  isValidPhone,
  validateProduct,
  validateUserRegistration,
};
