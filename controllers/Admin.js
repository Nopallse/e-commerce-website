const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const path = require("path");
const fs = require("fs").promises;
const { Op, where } = require("sequelize");
const bcrypt = require("bcryptjs");
const adminController = {
  // Dashboard
  getDashboard: async (req, res) => {
    const orders = await Order.findAll({
      include: ["User", "OrderItems"],
      order: [["createdAt", "DESC"]],
    });
    console.log(orders);

    const customer = await User.findAll();
    const total_penjualan = await Order.sum("totalAmount");
    const rata_rata_order = total_penjualan / orders.length;
    const total_order = orders.length;
    const total_user = customer.length - 1;

    res.render("admin/dashboard", {
      path: req.path,
      orders,
      user: req.user,
      total_penjualan,
      rata_rata_order,
      total_order,
      total_user,
    });
  },

  // Product Management
  getAllProducts: async (req, res) => {
    try {
      const products = await Product.findAll();
      res.render("admin/products", { path: req.path, products });
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  },

  getProductById: async (req, res) => {
    try {
      const [product] = await Promise.all([Product.findByPk(req.params.id)]);

      if (!product) {
        return res
          .status(404)
          .render("error", { message: "Product not found" });
      }

      res.render("admin/product-detail", { path: req.path, product });
    } catch (error) {
      console.error("Error:", error);
      res
        .status(500)
        .render("error", { message: "Error fetching product details" });
    }
  },

  getAddProductForm: async (req, res) => {
    res.render("admin/add-product", { path: req.path });
  },

  createProduct: async (req, res) => {
    try {
      const { name, description, price, stock, weight } = req.body;
      const product = await Product.create({
        name,
        description,
        price,
        stock,
        image: req.file ? `/uploads/products/${req.file.filename}` : null,
        weight,
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
        const filePath = path.join(
          "public/uploads/products",
          req.file.filename
        );
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
      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Search and Filter parameters
      const search = req.query.search || "";
      const status = req.query.status || "";
      const dateFrom = req.query.dateFrom || "";
      const dateTo = req.query.dateTo || "";
      const sortBy = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder || "DESC";

      // Build where clause
      const whereClause = {};
      if (search) {
        whereClause[Op.or] = [
          { midtransOrderId: { [Op.like]: `%${search}%` } },
        ];
      }
      if (status) {
        whereClause.status = status;
      }
      if (dateFrom && dateTo) {
        whereClause.createdAt = {
          [Op.between]: [new Date(dateFrom), new Date(dateTo)],
        };
      }

      // Get orders with pagination
      const { count, rows: orders } = await Order.findAndCountAll({
        include: ["User", "OrderItems"],
        where: whereClause,
        order: [[sortBy, sortOrder]],
        limit,
        offset,
      });

      // Calculate total pages
      const totalPages = Math.ceil(count / limit);

      res.render("admin/orders", {
        path: req.path,

        orders,
        user: req.user,
        pagination: {
          currentPage: page,
          totalPages,
          limit,
          totalItems: count,
        },
        filters: {
          search,
          status,
          dateFrom,
          dateTo,
          sortBy,
          sortOrder,
        },
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).send("Error fetching orders");
    }
  },

  getAllOrdersByStatus: async (req, res) => {
    try {
      // Pagination
      let status = req.params.status;
      if (status == "belum-bayar") {
        status = "Belum Bayar";
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Search and Filter parameters
      const search = req.query.search || "";
      const dateFrom = req.query.dateFrom || "";
      const dateTo = req.query.dateTo || "";
      const sortBy = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder || "DESC";

      // Build where clause
      const whereClause = {};
      if (search) {
        whereClause[Op.or] = [
          { midtransOrderId: { [Op.like]: `%${search}%` } },
        ];
      }
      if (status) {
        whereClause.status = status;
      }
      if (dateFrom && dateTo) {
        whereClause.createdAt = {
          [Op.between]: [new Date(dateFrom), new Date(dateTo)],
        };
      }

      // Get orders with pagination
      const { count, rows: orders } = await Order.findAndCountAll({
        include: ["User", "OrderItems"],
        where: whereClause,
        order: [[sortBy, sortOrder]],
        limit,
        offset,
      });

      // Calculate total pages
      const totalPages = Math.ceil(count / limit);
      // Add special handling for "selesai" path

      res.render("admin/orders", {
        path: req.path,
        orders,
        user: req.user,
        pagination: {
          currentPage: page,
          totalPages,
          limit,
          totalItems: count,
        },
        filters: {
          search,
          status,
          dateFrom,
          dateTo,
          sortBy,
          sortOrder,
        },
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).send("Error fetching orders");
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
  },

  updateResi: async (req, res) => {
    try {
      const { id } = req.params;
      const { resi } = req.body;

      const order = await Order.findByPk(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      await order.update(
        {
          resi,
          status: "Dikirim",
        },
        { fields: ["resi", "status"] }
      );
      res.redirect(`/admin/order/${id}`);
    } catch (error) {
      res.status(500).json({ message: "Error updating order status" });
    }
  },

  async getOrderDetails(req, res) {
    try {
      const order = await Order.findOne({
        where: {
          id: req.params.id,
        },
        include: [
          {
            model: OrderItem,
            include: [Product],
          },
          {
            model: User,
          },
        ],
      });

      if (!order) {
        return res.status(404).send("Order not found");
      }
      var status = order.status;
      if (status == "Belum Bayar") {
        status = "belum-bayar";
      } else if (status == "Dikemas") {
        status = "dikemas";
      } else if (status == "Dikirim") {
        status = "dikirim";
      } else if (status == "Selesai") {
        status = "selesai";
      } else if (status == "Dibatalkan") {
        status = "dibatalkan";
      }

      res.render(`admin/orders-detail/${status}`, {
        order,
        path: req.path,
      });
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).send("Error fetching order details");
    }
  },

  // User Management
  getAllUsers: async (req, res) => {
    try {
      const users = await User.findAll({
        where: {
          role: "user",
        },
        attributes: ["id", "fullName", "email", "phone"],
      });
      console.log(req.path);
      res.render("admin/customers", { path: req.path, users });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.render("admin/customer-detail", { path: req.path, user });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Error fetching user" });
    }
  },

  getSettings: async (req, res) => {
    try {
      const admin = await User.findByPk(req.user.id);
      res.render("admin/settings", { path: req.path, admin });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).send("Error fetching settings");
    }
  },
  updateSettings: async (req, res) => {
    try {
      // Handle the different types of settings updates
      const { id } = req.user;
      console.log(req.body);
      const admin = await User.findByPk(id);
      if (!admin) {
        return res.status(404).json({ error: "Admin not found" });
      }
      const type = req.body.fullName ? "profile" : "security";




    

      switch (type) {
        case "profile":
          const { fullName, email, phone } = req.body;
          await admin.update({ fullName, email, phone });
          console.log(admin);
          break;
        case "security":
          const { currentPassword, newPassword } = req.body;

          const isPasswordValid = await bcrypt.compare(
            currentPassword,
            admin.password
          );
          if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid current password" });
          }
          
          const hashedPassword = await bcrypt.hash(newPassword, 10);

          await admin.update({ password: hashedPassword });
          console.log(admin);
          // Update security settings
          break;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Error updating settings" });
    }
  },
};

module.exports = adminController;
