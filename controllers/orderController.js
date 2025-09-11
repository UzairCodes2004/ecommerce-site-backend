const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  // Validate shipping address
  if (
    !shippingAddress ||
    !shippingAddress.address ||
    !shippingAddress.city ||
    !shippingAddress.postalCode ||
    !shippingAddress.country
  ) {
    res.status(400);
    throw new Error("Shipping address is incomplete");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Reduce stock for each product
    for (const item of orderItems) {
      const product = await Product.findById(item.product || item._id).session(
        session
      );
      if (!product) {
        res.status(404);
        throw new Error(`Product not found: ${item.name}`);
      }
      if (product.countInStock < item.qty) {
        res.status(400);
        throw new Error(`Not enough stock for ${item.name}`);
      }

      product.countInStock -= item.qty;
      await product.save({ session });
    }

    // Create order
    const order = new Order({
      orderItems: orderItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        image: item.image,
        price: item.price,
        product: item.product || item._id,
      })),
      user: req.user._id,
      shippingAddress, // Order-specific address
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save({ session });

    // Update the user's last used shipping address (profile)
    await User.findByIdAndUpdate(
      req.user._id,
      { shippingAddress: shippingAddress },
      { new: true, runValidators: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(createdOrder);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Re-throw the error to be handled by asyncHandler
    throw error;
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (order) {
    // Check if the user owns the order or is an admin
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      res.status(401);
      throw new Error("Not authorized to view this order");
    }

    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Check if the user owns the order or is an admin
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized to update this order");
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: uuidv4(), // generate unique payment ID
    status: req.body.status || "COMPLETED",
    update_time: req.body.update_time || new Date().toISOString(),
    email_address: req.body.email_address,
  };

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized as admin");
  }

  const orders = await Order.find({}).populate("user", "id name");
  res.json(orders);
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // ✅ Allow owner OR admin to cancel
  if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error("Not authorized to cancel this order");
  }

  if (order.isCancelled) {
    res.status(400);
    throw new Error("Order is already cancelled");
  }

  // Unpaid → cancel anytime
  if (!order.isPaid) {
    order.isCancelled = true;
    order.cancelledAt = Date.now();
  } else {
    // Paid → allow only within 24h
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
