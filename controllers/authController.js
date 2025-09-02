const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { generateToken } = require("../utils/generateToken");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please include all fields: name, email, password");
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists with this email");
  }

  // ✅ NEW: Check if email is in admin whitelist (SAFE ADDITION)
  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",")
    : [];
  const isAdmin = adminEmails.includes(email);

  
  const user = await User.create({
    name,
    email,
    password,
    isAdmin, 
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin, 
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please include email and password");
  }

  // Check for user and match password
  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    // ✅ NEW: Check and update admin status on EVERY login (SAFE ADDITION)
    const adminEmails = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(",")
      : [];
    const shouldBeAdmin = adminEmails.includes(email);

    // If user should be admin but isn't, update them
    if (shouldBeAdmin && !user.isAdmin) {
      user.isAdmin = true;
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
  });
});

// ✅ NEW: Admin promotion endpoint (SAFE ADDITION)
const promoteToAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Security check: Only allow from same origin or add authentication if needed
  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",")
    : [];

  if (!adminEmails.includes(email)) {
    res.status(403);
    throw new Error("Email not authorized for admin promotion");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isAdmin = true;
  await user.save();

  res.json({
    success: true,
    message: "User promoted to admin successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    },
  });
});

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  promoteToAdmin,
};
