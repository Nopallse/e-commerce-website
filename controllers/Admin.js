const Product = require("../models/Product");
const Order = require("../models/Order");
const path = require("path");
const fs = require("fs").promises;

const adminController = {
  // Dashboard
  getDashboard: (req, res) => {
    res.render("admin/dashboard", { user: req.user });
  },

  // Product Management
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.findAll();
      res.render("admin/products", { products });
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  },

  getProductById: async (req, res) => {
    try {
      const [product] = await Promise.all([Product.findByPk(req.params.id)]);

      if (!product) {
        return res.status(404).render("error", { message: "Product not found" });
      }

      res.render("admin/product-detail", { product });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).render("error", { message: "Error fetching product details" });
    }
  },

  getAddProductForm: async (req, res) => {
    res.render("admin/add-product");
  },

  createProduct: async (req, res) => {
    try {
      const { name, description, price, stock } = req.body;
      const product = await Product.create({
        name,
        description,
        price,
        stock,
        image: req.file ? `/uploads/products/${req.file.filename}` : null,
      });
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Error creating product" });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, stock } = req.body;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      let imageUrl = product.image;
      if (req.file) {
        if (product.image) {
          const oldImagePath = path.join("public", product.image);
          try {
            await fs.access(oldImagePath);
            await fs.unlink(oldImagePath);
          } catch (error) {
            console.warn("Old image file not found:", oldImagePath);
          }
        }
        imageUrl = `/uploads/products/${req.file.filename}`;
      }

      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ message: "Invalid price value" });
      }

      const numericStock = parseInt(stock);
      if (isNaN(numericStock) || numericStock < 0) {
        return res.status(400).json({ message: "Invalid stock value" });
      }

      const updatedProduct = await product.update({
        name: name?.trim(),
        description: description?.trim(),
        price: numericPrice,
        stock: numericStock,
        image: imageUrl,
      });

      res.json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Error updating product:", error);

      if (req.file) {
        const filePath = path.join("public/uploads/products", req.file.filename);
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          console.error("Error deleting uploaded file:", unlinkError);
        }
      }

      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }

      res.status(500).json({
        message: "Error updating product",
        error: error.message,
      });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      await product.destroy();
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting product" });
    }
  },

  // Order Management
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.findAll({
        include: ["User", "OrderItems"],
      });
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await Order.findByPk(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      await order.update({ status });
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Error updating order status" });
    }
  }
};

module.exports = adminController;