const express = require("express");
const router = express.Router();
const { User } = require("../models");
const jwt = require("jsonwebtoken");
const productController = require("../controllers/Product");
const { Cart, CartItem, Product } = require("../models");
const { Op } = require("sequelize");
const { checkLogin } = require("../middleware/checkLogin");

router.get("/", checkLogin, async (req, res) => {
  res.render("user/home", {
    isLoggedIn: req.isLoggedIn,
    user: req.user,
    cartCount: req.cartCount,
  });
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/register", (req, res) => {
  res.render("register");
});

router.get("/product",checkLogin, productController.getAllProducts);
router.get("/product/:id",checkLogin, productController.getProductById);
router.get("/about", checkLogin, async (req, res) => {
  res.render("user/about", {
    isLoggedIn: req.isLoggedIn,
    user: req.user,
    cartCount: req.cartCount,
  });
});

module.exports = router;
