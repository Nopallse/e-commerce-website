const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const Product = require("../models/Product");
const User = require("../models/User");
const db = require("../config/database.js");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const axios = require("axios");
const midtransClient = require("midtrans-client");

async function getCartItems(userId) {
  try {
    // Ambil cart berdasarkan userId, kemudian ambil item dalam cart tersebut
    const cart = await Cart.findOne({
      where: { userId }, // Cari cart berdasarkan userId
      include: [
        {
          model: CartItem,
          include: [
            {
              model: Product,
              attributes: ["id", "name", "price", "image"], // Pilih atribut yang diperlukan
            },
          ],
        },
      ],
    });

    if (!cart) {
      throw new Error("Cart not found for this user");
    }

    return cart.CartItems.map((item) => ({
      id: item.id,
      Product: item.Product,
      quantity: item.quantity,
    }));
  } catch (error) {
    console.error("Error fetching cart items:", error);
    throw new Error("Could not retrieve cart items");
  }
}

class CartController {
  async getCart(req, res) {
    try {
      // Check if user is authenticated
      const isLoggedIn = req.user ? true : false;
      if (!isLoggedIn) {
        return res.redirect("/login");
      }

      // Get user info
      const user = await User.findOne({
        where: { id: req.user.id },
        attributes: ["id", "fullName", "email"],
      });

      // Get or create cart
      let [cart] = await Cart.findOrCreate({
        where: { userId: req.user.id },
      });

      console.log(cart);

      // Get cart items with product details
      const cartItems = await CartItem.findAll({
        where: { cartId: cart.id },
        include: [
          {
            model: Product,
            attributes: ["name", "price", "image"],
          },
        ],
      });

      console.log(cartItems);

      // Calculate total price
      const totalPrice = cartItems.reduce((sum, item) => {
        return sum + item.Product.price * item.quantity;
      }, 0);

      // Get total items count for header
      const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      res.render("user/cart", {
        cartItems,
        totalPrice,
        cartCount,
        isLoggedIn,
        user,
      });
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).send("Error fetching cart");
    }
  }

  async getOrderConfirmation(req, res) {
    try {
      // Check if user is authenticated
      const isLoggedIn = req.user ? true : false;
      if (!isLoggedIn) {
        return res.redirect("/login");
      }

      // Get user info
      const user = await User.findOne({
        where: { id: req.user.id },
      });

      // Get or create cart
      let [cart] = await Cart.findOrCreate({
        where: { userId: req.user.id },
      });

      // Get cart items with product details
      const cartItems = await CartItem.findAll({
        where: { cartId: cart.id },
        include: [
          {
            model: Product,
            attributes: ["name", "price", "image"],
          },
        ],
      });

      // Calculate total price
      const totalPrice = cartItems.reduce((sum, item) => {
        return sum + item.Product.price * item.quantity;
      }, 0);

      // Calculate total weight (assuming each product is 1000g or 1kg)
      const totalWeight = cartItems.reduce((sum, item) => {
        return sum + 1000 * item.quantity; // 1000g per item
      }, 0);

      // Get total items count for header
      const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      // Available couriers
      const couriers = [
        { id: "jne", name: "JNE Express", image: "/images/couriers/jne.png" },
        {
          id: "sicepat",
          name: "SiCepat",
          image: "/images/couriers/sicepat.png",
        },
        { id: "ide", name: "ID Express", image: "/images/couriers/ide.png" },
        { id: "sap", name: "SAP Express", image: "/images/couriers/sap.png" },
        { id: "jnt", name: "J&T Express", image: "/images/couriers/jnt.png" },
      ];

      // Payment methods
      const paymentMethods = [
        { id: "credit_card", name: "Credit Card" },
        { id: "bank_transfer", name: "Bank Transfer" },
        { id: "cash_on_delivery", name: "Cash on Delivery" },
      ];

      const formBody = new URLSearchParams({
        origin: "49287",
        destination: user.idPostalCode,
        weight: "1000",
        courier:
          "jne:sicepat:ide:ninja:tiki:lion:anteraja:ncs:rex:rpx:sentral:star:wahana:dse",
        price: "lowest",
      }).toString();

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          key: "fWIRKxbJ9ce7bc45dbd6c261tW3rtR6K",
        },
        body: formBody,
      };

      const shippingServices = await fetch(
        "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost",
        options
      )
        .then((res) => res.json())
        .then((data) => data.data) // Hanya ambil bagian `data` dari respons
        .catch((err) => {
          console.error("Error fetching shipping data:", err);
          return [];
        });

      console.log(shippingServices,">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

      res.render("user/order-confirmation", {
        cartItems,
        totalPrice,
        totalWeight,
        cartCount,
        isLoggedIn,
        user,
        couriers,
        paymentMethods,
        shippingServices,
      });
    } catch (error) {
      console.error("Error fetching order confirmation:", error);
      res.status(500).send("Error fetching order confirmation");
    }
  }

  async addToCart(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Please log in to add items to the cart" });
      }

      const { productId, quantity } = req.body;

      // Verify product exists and has enough stock
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (product.stock < quantity) {
        return res.status(400).json({ message: "Not enough stock" });
      }

      console.log(req.user);
      console.log(req.body);
      // Get or create cart
      let [cart] = await Cart.findOrCreate({
        where: { userId: req.user.id },
      });

      // Check if product already in cart
      let cartItem = await CartItem.findOne({
        where: {
          cartId: cart.id,
          productId: productId,
        },
      });

      if (cartItem) {
        // Update quantity if product already in cart
        cartItem.quantity += quantity;
        await cartItem.save();
      } else {
        // Create new cart item
        cartItem = await CartItem.create({
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
        });
      }

      res.status(200).json({ message: "Product added to cart" });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Error adding to cart" });
    }
  }

  async updateCartItem(req, res) {
    try {
      const { quantity } = req.body;
      const cartItemId = req.params.id;

      const cartItem = await CartItem.findOne({
        where: { id: cartItemId },
        include: [{ model: Cart }],
      });

      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      // Verify ownership
      if (cartItem.Cart.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Verify stock availability
      const product = await Product.findByPk(cartItem.productId);
      if (product.stock < quantity) {
        return res.status(400).json({ message: "Not enough stock" });
      }

      await cartItem.update({ quantity });
      res.json({ message: "Cart updated" });
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ message: "Error updating cart" });
    }
  }

  async removeCartItem(req, res) {
    try {
      const cartItemId = req.params.id;

      const cartItem = await CartItem.findOne({
        where: { id: cartItemId },
        include: [{ model: Cart }],
      });

      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      // Verify ownership
      if (cartItem.Cart.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await cartItem.destroy();
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing cart item:", error);
      res.status(500).json({ message: "Error removing cart item" });
    }
  }

  async checkout(req, res) {


    
    const t = await db.transaction();


    try {
      const isLoggedIn = req.user ? true : false;
      if (!isLoggedIn) {
        return res.redirect("/login");
      }
      // Get user info
      const user = await User.findOne({
        where: { id: req.user.id },
        attributes: ["id", "fullName", "email"],
      });

      const cart = await Cart.findOne({
        where: { userId: req.user.id },
        include: [
          {
            model: CartItem,
            include: [Product],
          },
        ],
      });


      // Get cart items with product details
      const cartItems = await CartItem.findAll({
        where: { cartId: cart.id },
        include: [
          {
            model: Product,
            attributes: ["name", "price", "image"],
          },
        ],
      });

      console.log(cartItems);

      // Calculate total price
      const totalPrice = cartItems.reduce((sum, item) => {
        return sum + item.Product.price * item.quantity;
      }, 0);

      // Get total items count for header
      const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const { selectedShipping, shippingCost } = req.body;
      const parsedShipping = JSON.parse(selectedShipping);
      const shippingFee = parseInt(shippingCost, 10);

      // Find user's cart and items
     

      if (!cart || cart.CartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Calculate product total
      const productTotal = cart.CartItems.reduce((sum, item) => {
        return sum + item.Product.price * item.quantity;
      }, 0);

      const totalAmount = productTotal + shippingFee;

      // Create order
      const order = await Order.create(
        {
          userId: req.user.id,
          totalAmount: totalAmount,
          shippingCost: shippingFee,
          shippingService: parsedShipping.name,
          status: "pending",
          paymentStatus: "pending",
        },
        { transaction: t }
      );

      // Create order items & update stock
      const orderItems = await Promise.all(
        cart.CartItems.map(async (cartItem) => {
          if (cartItem.Product.stock < cartItem.quantity) {
            throw new Error(`Insufficient stock for ${cartItem.Product.name}`);
          }

          await cartItem.Product.update(
            { stock: cartItem.Product.stock - cartItem.quantity },
            { transaction: t }
          );

          return OrderItem.create(
            {
              orderId: order.id,
              productId: cartItem.productId,
              quantity: cartItem.quantity,
              price: cartItem.Product.price,
            },
            { transaction: t }
          );
        })
      );

      // Clear cart
      await CartItem.destroy({
        where: { cartId: cart.id },
        transaction: t,
      });

      // Prepare item details for Midtrans
      const itemDetails = cart.CartItems.map((item) => ({
        id: item.Product.id,
        price: item.Product.price,
        quantity: item.quantity,
        name: item.Product.name.substring(0, 50), // Midtrans has 50 char limit
      }));

      // Add shipping fee as an item
      itemDetails.push({
        id: "SHIPPING",
        price: shippingFee,
        quantity: 1,
        name: `Shipping Fee (${parsedShipping.name})`,
      });

      await t.commit();

      // Initialize Midtrans Snap for Development
      console.log("Initializing Midtrans in sandbox mode...");
      console.log("MIDTRANS_SERVER_KEY_SANDBOX:", process.env.MIDTRANS_SERVER_KEY_SANDBOX);
      let snap = new midtransClient.Snap({
        // Set to true if you want Production Environment (accept real transaction).
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY_SANDBOX,
      });
      
      console.log("Snap instance created:", snap);

      const orderId = `ORDER-${order.id}-${Date.now()}`;

      const transactionDetails = {
        transaction_details: {
          order_id: orderId,
          gross_amount: totalAmount,
        },
        item_details: itemDetails,
        customer_details: {
          first_name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || "0812345678", // Add phone if available
        },
        credit_card: {
          secure: true,
        },
        callbacks: {
          finish: `${process.env.FRONTEND_URL}/order/status/${order.id}`,
          error: `${process.env.FRONTEND_URL}/order/error/${order.id}`,
          pending: `${process.env.FRONTEND_URL}/order/pending/${order.id}`,
        },
      };

      console.log("Transaction details prepared:", transactionDetails);

      const transaction = await snap.createTransaction(transactionDetails);

      // Update order with Midtrans orderId
      await order.update({
        midtransOrderId: orderId,
      });

      console.log("Transaction created successfully:", transaction);


      res.render('user/payment', {
        orderId: order.id,
        paymentToken: transaction.token,
        isLoggedIn: isLoggedIn,
        user,
        cartCount
    });
    } catch (error) {
      if (t.finished !== "commit") {
        await t.rollback();
      }

      console.error("Error during checkout:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error during checkout",
      });
    }
  }
}

module.exports = new CartController();
