const mongoose = require("mongoose");

const cartItemSchema = mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Product",
  },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  qty: { type: Number, required: true, min: 1, default: 1 },
});

const cartSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      unique: true, // Each user can have only one cart
    },
    cartItems: [cartItemSchema],
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalItems: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before saving
cartSchema.pre("save", function (next) {
  this.totalItems = this.cartItems.reduce((acc, item) => acc + item.qty, 0);
  this.totalPrice = this.cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
