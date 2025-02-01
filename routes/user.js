// routes/user.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { Product } = require('../models/Product');
const { Cart, CartItem } = require('../models/Cart');
const { Order, OrderItem } = require('../models/Order');
const productController = require('../controllers/Product');
const cartController = require('../controllers/Cart');
const orderController = require('../controllers/Order');
const userController = require('../controllers/Users');
const {checkLogin} = require('../middleware/checkLogin');
// Apply middleware to all user routes
router.use(verifyToken);

router.post('/update-address', userController.updateAddress);


router.get('/cart', cartController.getCart);
router.post('/cart/add', cartController.addToCart);
router.put('/cart/update/:id', cartController.updateCartItem);
router.delete('/cart/remove/:id', cartController.removeCartItem);
router.post('/cart/checkout', cartController.checkout);
router.get('/cart/confirm', cartController.getOrderConfirmation);


router.get('/orders', orderController.getAllOrders);
router.get('/orders/:id', orderController.getOrderDetails);
router.get('/orders/:id/confirmation', orderController.getOrderConfirmation);
router.post('/orders/:id/update-payment-status', orderController.updatePaymentStatus);

router.get('/payment/:orderId', orderController.getPaymentPage);
router.get('/my-account',checkLogin, userController.getDashboard);


















// Cart Management
router.get('/cart', async (req, res) => {
  try {
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{
        model: CartItem,
        include: [Product]
      }]
    });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart' });
  }
});

router.post('/cart/items', async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id });
    }

    const cartItem = await CartItem.create({
      cartId: cart.id,
      productId,
      quantity
    });

    res.status(201).json(cartItem);
  } catch (error) {
    res.status(500).json({ message: 'Error adding item to cart' });
  }
});

// Order Management
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [{
        model: OrderItem,
        include: [Product]
      }]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    
    // Get cart items
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{
        model: CartItem,
        include: [Product]
      }]
    });

    if (!cart || !cart.CartItems.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total
    const totalAmount = cart.CartItems.reduce((sum, item) => {
      return sum + (item.Product.price * item.quantity);
    }, 0);

    // Create order
    const order = await Order.create({
      userId: req.user.id,
      totalAmount,
      status: 'pending',
      shippingAddress,
      paymentStatus: 'pending'
    });

    // Create order items
    await Promise.all(cart.CartItems.map(item => {
      return OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.Product.price
      });
    }));

    // Clear cart
    await CartItem.destroy({ where: { cartId: cart.id } });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order' });
  }
});

module.exports = router;