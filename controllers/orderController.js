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

  // Reduce stock for each product
  for (const item of orderItems) {
    const product = await Product.findById(item.product || item._id);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.name}`);
    }
    if (product.countInStock < item.qty) {
      res.status(400);
      throw new Error(`Not enough stock for ${item.name}`);
    }

    product.countInStock -= item.qty;
    await product.save();
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

  const createdOrder = await order.save();

  // Update the user's last used shipping address (profile)
  await User.findByIdAndUpdate(
    req.user._id,
    { shippingAddress: shippingAddress },
    { new: true, runValidators: true }
  );

  res.status(201).json(createdOrder);
});

module.exports = createOrder;

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
  const orders = await Order.find({}).populate("user", "id name");
  res.json(orders);
});

// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
// @access  Private

const cancelOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.isCanceled) {
      res.status(400);
      throw new Error("Order is already canceled");
    }

    // Cancel unpaid orders anytime
    if (!order.isPaid) {
      order.isCanceled = true;
      order.canceledAt = Date.now();
    } else {
      // Paid orders: allow cancellation only within 24 hours
      const paidAt = new Date(order.paidAt);
      const now = new Date();
      const hoursSincePayment = (now - paidAt) / (1000 * 60 * 60);

      if (hoursSincePayment > 24) {
        res.status(400);
        throw new Error("Paid orders can only be canceled within 24 hours");
      }

      order.isCanceled = true;
      order.canceledAt = now;
    }

    // Restore stock for each product
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { countInStock: item.qty } },
        { new: true, session }
      );
    }

    const updatedOrder = await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Order canceled successfully. Stock has been restored.",
      order: updatedOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(error.statusCode || 500);
    throw new Error(error.message || "Order cancellation failed");
  }
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  getOrders,
  cancelOrder,
};
