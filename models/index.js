const Sequelize = require("sequelize");
const db = require("../config/database.js");

// Import models
const User = require("./User");
const Cart = require("./Cart");
const CartItem = require("./CartItem");
const Category = require("./Category");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Product = require("./Product");

// Associations
User.hasMany(Cart, { foreignKey: "userId" });
Cart.belongsTo(User, { foreignKey: "userId" });

Cart.hasMany(CartItem, { foreignKey: "cartId" });
CartItem.belongsTo(Cart, { foreignKey: "cartId" });

CartItem.belongsTo(Product, { foreignKey: "productId" });
Product.hasMany(CartItem, { foreignKey: "productId" });

User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });

Order.hasMany(OrderItem, { foreignKey: "orderId" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });

OrderItem.belongsTo(Product, { foreignKey: "productId" });
Product.hasMany(OrderItem, { foreignKey: "productId" });

Category.hasMany(Product, { foreignKey: "categoryId" });
Product.belongsTo(Category, { foreignKey: "categoryId" });

module.exports = {
  db,
  User,
  Cart,
  CartItem,
  Category,
  Order,
  OrderItem,
  Product,
};
