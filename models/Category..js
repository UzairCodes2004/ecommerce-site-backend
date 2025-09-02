const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    image: {
      type: String,
      required: true,
      default: "/images/category-sample.jpg",
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for better performance on category queries
categorySchema.index({ name: 1 });

module.exports = mongoose.model("Category", categorySchema);
