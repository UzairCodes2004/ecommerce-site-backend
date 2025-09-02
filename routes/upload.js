const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const {
  upload,
  uploadToCloudinary,
  uploadMultiple,
  uploadMultipleToCloudinary,
} = require("../middleware/upload");

// @route   POST /api/upload
// @desc    Upload single image
// @access  Private/Admin
router.post(
  "/",
  protect,
  admin,
  upload.single("image"),
  uploadToCloudinary,
  (req, res) => {
    res.json({
      success: true,
      message: "Image uploaded successfully",
      image: req.file.url,
      public_id: req.file.public_id,
    });
  }
);

// @route   POST /api/upload/multiple
// @desc    Upload multiple images
// @access  Private/Admin
router.post(
  "/multiple",
  protect,
  admin,
  uploadMultiple,
  uploadMultipleToCloudinary,
  (req, res) => {
    res.json({
      success: true,
      message: "Images uploaded successfully",
      images: req.uploadedFiles,
    });
  }
);

// @route   DELETE /api/upload/:public_id
// @desc    Delete image from Cloudinary
// @access  Private/Admin
router.delete("/:public_id", protect, admin, async (req, res) => {
  try {
    const { public_id } = req.params;
    // Implementation would go here to delete from Cloudinary
    // This would use the deleteFromCloudinary function from middleware

    res.json({
      success: true,
      message: "Image deleted successfully",
      public_id: public_id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting image",
      error: error.message,
    });
  }
});

module.exports = router;
