// routes/upload.js
const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/auth");
const {
  upload,
  uploadToCloudinary,
  uploadMultiple,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
} = require("../middleware/upload");

// single upload: return { success, url, public_id }
router.post(
  "/",
  protect,
  admin,
  upload.single("image"),
  uploadToCloudinary,
  (req, res) => {
    try {
      console.log("[upload route] req.file:", Boolean(req.file), req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        urlExists: Boolean(req.file.url),
      } : null);
      console.log("[upload route] req.headers Authorization:", !!req.headers.authorization);

      if (!req.file || !req.file.url) {
        // Detailed error to help debugging
        return res.status(400).json({
          success: false,
          message:
            "Image upload failed: no file data or Cloudinary URL missing. Confirm multipart/form-data and that upload middleware completed.",
        });
      }

      return res.json({
        success: true,
        url: req.file.url,        // canonical key: url
        public_id: req.file.public_id,
      });
    } catch (err) {
      console.error("[upload route] unexpected error:", err);
      return res.status(500).json({ success: false, message: "Server error during upload", error: err.message });
    }
  }
);

router.post(
  "/multiple",
  protect,
  admin,
  uploadMultiple,
  uploadMultipleToCloudinary,
  (req, res) => {
    try {
      if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
        return res.status(400).json({ success: false, message: "Images are required" });
      }
      return res.json({ success: true, images: req.uploadedFiles });
    } catch (err) {
      console.error("[upload multiple] error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.delete("/:public_id", protect, admin, async (req, res) => {
  try {
    await deleteFromCloudinary(req.params.public_id);
    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("[upload delete] error:", error);
    res.status(500).json({ success: false, message: "Error deleting image", error: error.message });
  }
});

module.exports = router;
