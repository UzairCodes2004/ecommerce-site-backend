const multer = require("multer");
const path = require("path");
const {
  cloudinary,
  upload: cloudinaryUpload,
} = require("../config/cloudinary");

// Configure multer for memory storage (for Cloudinary)
const memoryStorage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Configure multer for memory storage
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Middleware to handle Cloudinary upload
const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "ecommerce-app",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" },
            { format: "webp" }, // Convert to webp for better performance
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(req.file.buffer);
    });

    // Add Cloudinary result to request object
    req.file.cloudinaryResult = result;
    req.file.url = result.secure_url;
    req.file.public_id = result.public_id;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to handle multiple file uploads
const uploadMultiple = upload.array("images", 5); // Max 5 files

// Middleware to process multiple Cloudinary uploads
const uploadMultipleToCloudinary = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const uploadPromises = req.files.map(async (file) => {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "ecommerce-app",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
              { quality: "auto" },
              { format: "webp" },
            ],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        stream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
        originalname: file.originalname,
      };
    });

    req.uploadedFiles = await Promise.all(uploadPromises);
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to delete file from Cloudinary
const deleteFromCloudinary = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  uploadMultiple,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
};
