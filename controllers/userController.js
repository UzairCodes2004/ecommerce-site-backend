const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const {generateToken} = require("../utils/generateToken");

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password");
  res.json(users);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    // Check if email is being updated and if it already exists
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        res.status(400);
        throw new Error("Email already exists");
      }
      user.email = req.body.email;
    }

    // Update name if provided
    if (req.body.name) {
      user.name = req.body.name;
    }

    // Update password if provided
    if (req.body.password) {
      if (req.body.password.length < 6) {
        res.status(400);
        throw new Error("Password must be at least 6 characters long");
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      token: generateToken(updatedUser._id), // Returns new token with updated info
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    await User.deleteOne({ _id: req.params.id });
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Promote user to admin
// @route   PUT /api/users/promote-to-admin
// @access  Private (Add extra security if needed)
const promoteToAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Optional: Add extra security check
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

  // Update user to admin
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
    token: generateToken(user._id),
  });
});
module.exports = {
  getUsers,
  getUserById,
  updateUserProfile,
  deleteUser,
  promoteToAdmin,
  getUserProfile,
};
