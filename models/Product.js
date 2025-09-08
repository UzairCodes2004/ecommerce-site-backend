const mongoose = require("mongoose");

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    reviews: [reviewSchema],
    rating: {
      type: Number,
      required: true,
      default: 0, 
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0, 
    },
    price: {
      type: Number,
      required: true,
      
      min: 0,
    },
    countInStock: {
      type: Number,
      required: true,
      // ❌ REMOVE default: 0
      min: 0,
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

// Calculate average rating when a review is added or removed
productSchema.methods.calculateAverageRating = function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
    return;
  }

  const total = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  this.rating = total / this.reviews.length;
  this.numReviews = this.reviews.length;
};

// Update average rating before saving
productSchema.pre("save", function (next) {
  this.calculateAverageRating();
  next();
});
productSchema.index({ name: "text", description: "text", brand: "text" });
module.exports = mongoose.model("Product", productSchema);
