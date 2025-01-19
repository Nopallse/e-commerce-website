const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const adminController = require("../controllers/Admin");
const multer = require("multer");
const path = require("path");

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/products");
  },
  filename: function (req, file, cb) {
    cb(null, `product-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

// Apply middleware to all admin routes
router.use(verifyToken);

// Dashboard
router.get("/dashboard", verifyToken, adminController.getDashboard);

// Product Management
router.get("/products", adminController.getAllProducts);
router.get("/products/:id", adminController.getProductById);
router.get("/add-product", adminController.getAddProductForm);
router.post("/products", upload.single("image"), adminController.createProduct);
router.put("/products/:id", upload.single("image"), adminController.updateProduct);
router.delete("/products/:id", adminController.deleteProduct);

// Order Management
router.get("/orders", adminController.getAllOrders);
router.put("/orders/:id/status", adminController.updateOrderStatus);

module.exports = router;