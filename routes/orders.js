const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, createOrder);

// @route   GET /api/orders/myorders
// @desc    Get logged in user orders
// @access  Private
router.get('/myorders', protect, getMyOrders);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, getOrderById);

// @route   PUT /api/orders/:id/pay
// @desc    Update order to paid
// @access  Private
router.put('/:id/pay', protect, updateOrderToPaid);

// @route   GET /api/orders
// @desc    Get all orders (Admin only)
// @access  Private/Admin
router.get('/', protect, admin, getOrders);

router.put('/:id/cancel', protect, cancelOrder);

router.get("/check-purchase/:productId", protect, checkPurchase);

// @route   DELETE /api/orders/:id
// @desc    Delete an order (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, admin, deleteOrder);

// @route   PUT /api/orders/:id/receive
// @desc    Mark order as delivered (User confirms delivery)
// @access  Private
router.put('/:id/receive', protect, markOrderAsDelivered);
// @route   PUT /api/orders/:id/ship
// @desc    Mark order as Shipped (Admin Only)
// @access  Private
router.put('/:id/ship', protect, admin, markOrderAsShipped);
// routes/orderRoutes.js
router.put('/:id/refund', protect, admin, refundOnCancellation);

router.put('/:id/mark-paid',protect,admin,markAsPaid)
module.exports = router;