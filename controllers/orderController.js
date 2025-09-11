// controllers/orderController.js
const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");
const Product = require("../models/Product");

// =======================
// @desc    Create new order
// @route   POST /api/orders
// @access  Private
// =======================
const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  // --- Calculate totals (always server-side for safety) ---
  const itemsPrice = orderItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const taxPrice = Number((itemsPrice * 0.1).toFixed(2)); // 10% example tax
  const shippingPrice = 0;
  const totalPrice = itemsPrice + taxPrice + shippingPrice;

  // --- Determine payment status ---
  let isPaid = false;
  let paidAt = null;

  if (paymentMethod !== "Cash on Delivery") {
    isPaid = true;
    paidAt = Date.now();
  }

  const order = new Order({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    isPaid,
    paidAt,
  });

  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
});

// =======================
// @desc    Get logged-in user orders
// @route   GET /api/orders/myorders
// @access  Private
// =======================
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(orders);
});

// =======================
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
// =======================
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only owner or admin can view
  if (
    order.user._id.toString() !== req.user._id.toString() &&
    !req.user.isAdmin
  ) {
    res.status(401);
    throw new Error("Not authorized to view this order");
  }

  res.json(order);
});

// =======================
// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
// =======================
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized to update this order");
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: uuidv4(),
    status: req.body.status || "COMPLETED",
    update_time: req.body.update_time || new Date().toISOString(),
    email_address: req.body.email_address || req.user.email,
  };

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// =======================
// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
// =======================
const getOrders = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized as admin");
  }

  const orders = await Order.find({})
    .populate("user", "id name")
    .sort({ createdAt: -1 });
  res.json(orders);
});

// =======================
// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
// =======================
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Owner or admin only
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized to cancel this order");
  }

  if (order.isCancelled) {
    res.status(400);
    throw new Error("Order is already cancelled");
  }

  // Unpaid orders → cancel anytime
  if (!order.isPaid) {
    order.isCancelled = true;
    order.cancelledAt = Date.now();
  } else {
    // Paid orders → only within 24h
    const hoursSincePayment =
      (Date.now() - new Date(order.paidAt)) / (1000 * 60 * 60);
    if (hoursSincePayment > 24) {
      res.status(400);
      throw new Error("Paid orders can only be cancelled within 24 hours");
    }

    order.isCancelled = true;
    order.cancelledAt = Date.now();
  }

  // Restore stock
  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { countInStock: item.qty } },
      { new: true }
    );
  }

  const updatedOrder = await order.save();
  res.json({
    success: true,
    message: "Order cancelled successfully. Stock has been restored.",
    order: updatedOrder,
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  getOrders,
  cancelOrder,
};
