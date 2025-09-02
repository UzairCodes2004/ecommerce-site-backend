const mongoose = require("mongoose");

const orderItemSchema = mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Product",
  },
});

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Credit Card", "PayPal", "Stripe", "Cash on Delivery"],
      default: "Credit Card",
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    itemsPrice: { type: Number, required: true, default: 0.0, min: 0 },
    taxPrice: { type: Number, required: true, default: 0.0, min: 0 },
    shippingPrice: { type: Number, required: true, default: 0.0, min: 0 },
    totalPrice: { type: Number, required: true, default: 0.0, min: 0 },

    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },

    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },

    // --- New fields for cancellation lifecycle ---
    isCancelled: { type: Boolean, required: true, default: false },
    cancelledAt: { type: Date },

    // Orders can only be cancelled before this timestamp
    cancellableUntil: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from creation
    },

    // Optional refund flags if you plan to mark paid cancellations
    isRefunded: { type: Boolean, default: false },
    refundedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Calculate total price before saving
orderSchema.pre("save", function (next) {
  this.itemsPrice = this.orderItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  this.taxPrice = Number((this.itemsPrice * 0.1).toFixed(2));
  this.shippingPrice = this.itemsPrice > 100 ? 0 : 10;
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice;

  if (!this.cancellableUntil) {
    this.cancellableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  next();
});

module.exports = mongoose.model("Order", orderSchema);
