// controllers/orderController.js
const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");
const Product = require("../models/Product");
const mongoose = require("mongoose");


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

  // Validate order items structure
  for (const item of orderItems) {
    if (!item.product) {
      res.status(400);
      throw new Error("Invalid order item: missing product ID");
    }
  }

  // --- Deduct stock for each item ---
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.name}`);
    }

    if (product.countInStock < item.qty) {
      res.status(400);
      throw new Error(`Not enough stock for ${product.name}. Available: ${product.countInStock}, Requested: ${item.qty}`);
    }

    // Double check to ensure stock doesn't go below zero
    const newStock = product.countInStock - item.qty;
    if (newStock < 0) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    product.countInStock = newStock;
    await product.save(); // ✅ Important: persist the change
  }

  // --- Calculate totals (always server-side for safety) ---
  const itemsPrice = orderItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const taxPrice = Number((itemsPrice * 0.1).toFixed(2)); // 10% tax
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

  // ❌ Cannot cancel if shipped or delivered (applies to everyone)
  if (order.isShipped || order.isDelivered) {
    res.status(400);
    throw new Error("Order cannot be cancelled once shipped or delivered");
  }

  if (order.isCancelled) {
    res.status(400);
    throw new Error("Order is already cancelled");
  }

  const isAdmin = req.user.isAdmin;
  const isOwner = order.user.toString() === req.user._id.toString();

  // For regular users: apply 24-hour restriction on paid orders
  if (!isAdmin && order.isPaid) {
    const hoursSincePayment = (Date.now() - new Date(order.paidAt)) / (1000 * 60 * 60);
    if (hoursSincePayment > 24) {
      res.status(400);
      throw new Error("Paid orders can only be cancelled within 24 hours. Please contact admin for assistance.");
    }
  }

  // For admins: no time restriction, but still can't cancel shipped/delivered orders
  // (the shipped/delivered check above already handles this)

  order.isCancelled = true;
  order.cancelledAt = Date.now();
  // order.cancelledBy = isAdmin ? 'admin' : 'customer'; // Track who cancelled

  // Restore stock (always restore stock when cancelling)
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
    message: isAdmin 
      ? "Order cancelled successfully by admin. Stock has been restored."
      : "Order cancelled successfully. Stock has been restored.",
    order: updatedOrder,
  });
});
// =======================
// @desc    Check if logged-in user purchased a product
// @route   GET /api/orders/check-purchase/:productId
// @access  Private
// =======================
// =======================
const checkPurchase = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;

  // Check if productId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.json({ isPaid: false });
  }

  const productObjectId = new mongoose.Types.ObjectId(productId);

  console.log("🔍 Checking purchase - User:", userId, "Product:", productId);

  const order = await Order.findOne({
    user: userId,
    "orderItems.product": productObjectId,
    isPaid: true,
  }).select("_id orderItems");

  console.log("✅ Found order:", order);

  res.json({ isPaid: !!order });
});

// =======================
// @desc    Delete an order (Admin only)
// @route   DELETE /api/orders/:id
// @access  Private/Admin
// =======================
const deleteOrder = asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized as admin");
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // ❌ Cannot delete if shipped or delivered
  if (order.isShipped || order.isDelivered) {
    res.status(400);
    throw new Error("Order cannot be deleted once shipped or delivered");
  }

  // Restore stock if not cancelled already
  if (!order.isCancelled) {
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { countInStock: item.qty } },
        { new: true }
      );
    }
  }

  await order.deleteOne();

  res.json({
    success: true,
    message: "Order deleted successfully by admin",
  });
});


// =======================
// @desc    Mark order as delivered (User confirms delivery)
// @route   PUT /api/orders/:id/receive
// @access  Private (user only)
// =======================
const markOrderAsDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only the owner can mark as delivered
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized to mark this order as delivered");
  }

  // Must be shipped before it can be delivered
  if (!order.isShipped) {
    res.status(400);
    throw new Error("You cannot mark the order as delivered until it has been shipped by the seller");
  }

  // Already delivered?
  if (order.isDelivered) {
    res.status(400);
    throw new Error("Order is already marked as delivered");
  }

  order.isDelivered = true;
  order.deliveredAt=Date.now()
  const updatedOrder = await order.save();

  res.json({
    success: true,
    message: "Order confirmed as delivered",
    order: updatedOrder,
  });
});


// @desc    Mark order as shipped (Admin only)
// @route   PUT /api/orders/:id/ship
// @access  Private/Admin
// =======================
const markOrderAsShipped = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only admin can mark as shipped
  if (!req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized as admin");
  }

  // Already shipped?
  if (order.isShipped) {
    res.status(400);
    throw new Error("Order is already marked as shipped");
  }

  // Cannot ship cancelled orders
  if (order.isCancelled) {
    res.status(400);
    throw new Error("Cannot ship a cancelled order");
  }



  order.isShipped = true;
  order.shippedAt=Date.now()

  const updatedOrder = await order.save();

  res.json({
    success: true,
    message: "Order marked as shipped successfully",
    order: updatedOrder,
  });
});

// =======================
// @desc    Process refund for cancelled order (Admin only)
// @route   PUT /api/orders/:id/refund
// @access  Private/Admin
// =======================
const refundOnCancellation = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only admin can process refunds
  if (!req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized as admin");
  }

  // ❌ Cannot refund if order is not cancelled
  if (!order.isCancelled) {
    res.status(400);
    throw new Error("Refund can only be processed for cancelled orders");
  }

  // ❌ Cannot refund if already refunded
  if (order.isRefunded) {
    res.status(400);
    throw new Error("Order is already refunded");
  } 

  // ❌ Cannot refund unpaid orders
  if (!order.isPaid) {
    res.status(400);
    throw new Error("Cannot refund an unpaid order");
  }

  // ✅ Process refund logic here
  // This is where you would integrate with your payment gateway
  // (PayPal, Stripe, etc.) to actually process the refund

  order.isRefunded = true;
  order.refundedAt = Date.now();
  order.refundAmount = order.totalPrice; // Full refund by default
  // order.refundedBy = req.user._id; // Track which admin processed the refund

  // Optional: Add refund reason from request body
  // if (req.body.refundReason) {
  //   order.refundReason = req.body.refundReason;
  // }

  const updatedOrder = await order.save();



  res.json({
    success: true,
    message: `Refund of $${order.totalPrice.toFixed(2)} processed successfully`,
    order: updatedOrder,
  });
});
// =======================
// @desc    Mark order as paid (Admin only)
// @route   PUT /api/orders/:id/mark-paid
// @access  Private/Admin
// =======================
const markAsPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only admin can mark as paid
  if (!req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized as admin");
  }

  // Already paid?
  if (order.isPaid) {
    res.status(400);
    throw new Error("Order is already marked as paid");
  }

  // Cannot mark cancelled orders as paid
  if (order.isCancelled) {
    res.status(400);
    throw new Error("Cannot mark a cancelled order as paid");
  }

  // Mark as paid
  order.isPaid = true;
  order.paidAt = Date.now();
  
  // Add payment details (optional)
  order.paymentResult = {
    id: uuidv4(),
    status: "ADMIN_MARKED_PAID",
    update_time: new Date().toISOString(),
    email_address: req.user.email,
    adminNote: req.body.adminNote || "Manually marked as paid by admin"
  };

  const updatedOrder = await order.save();

  res.json({
    success: true,
    message: "Order marked as paid successfully",
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
  checkPurchase,
  deleteOrder,
  markOrderAsDelivered,
  markOrderAsShipped,
  refundOnCancellation,
  markAsPaid,
};
