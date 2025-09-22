// middleware/upload.js
const multer = require("multer");
const path = require("path");
const { cloudinary } = require("../config/cloudinary");

// Memory storage (we upload buffer to Cloudinary)
const memoryStorage = multer.memoryStorage();

// File filter (images only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) cb(null, true);
  else cb(new Error("Only image files are allowed (jpeg/jpg/png/webp/gif)"));
};

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

// Helper: upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder = "ecommerce-app") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [{ width: 800, height: 800, crop: "limit" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

// Single upload middleware
const uploadToCloudinary = async (req, res, next) => {
  try {
    // Debug log
    console.log("uploadToCloudinary middleware start - hasFile:", Boolean(req.file));
    if (!req.file) {
      // No file -> explicitly respond with helpful message
      return res.status(400).json({ success: false, message: "No file uploaded (field 'image' missing or multipart/form-data not sent)" });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer);
    req.file.cloudinaryResult = result;
    req.file.url = result.secure_url;
    req.file.public_id = result.public_id;

    // Debug log
    console.log("Cloudinary result:", { url: req.file.url, public_id: req.file.public_id });

    next();
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    // return clear JSON error so frontend sees message
    return res.status(500).json({ success: false, message: "Cloudinary upload failed", error: err.message });
  }
};

// Multiple uploads
const uploadMultiple = upload.array("images", 5);
const uploadMultipleToCloudinary = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded (field 'images')" });
    }

    const uploads = await Promise.all(
      req.files.map(file => uploadBufferToCloudinary(file.buffer).then(res => ({
        url: res.secure_url,
        public_id: res.public_id,
        originalname: file.originalname
      })))
    );

    req.uploadedFiles = uploads;
    next();
  } catch (err) {
    console.error("Cloudinary multiple upload error:", err);
    return res.status(500).json({ success: false, message: "Multiple upload failed", error: err.message });
  }
};

const deleteFromCloudinary = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (err) {
    console.error("Cloudinary delete error:", err);
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  uploadMultiple,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
};
