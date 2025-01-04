const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const { Op } = require('sequelize');

class ProductController {
    async getAllProducts(req, res) {
        try {
            const { category, search } = req.query;
            const where = {};
            
            if (category) {
                where.categoryId = category;
            }
            
            if (search) {
                where.name = {
                    [Op.like]: `%${search}%`
                };
            }

            const products = await Product.findAll({
                where,
                include: [{
                    model: Category,
                    attributes: ['name']
                }],
                order: [['createdAt', 'DESC']]
            });

            const categories = await Category.findAll();
            
            // Get cart count and user info if user is authenticated
            let cartCount = 0;
            let user = null;
            const isLoggedIn = req.user ? true : false;

            if (isLoggedIn) {
                user = await User.findOne({ 
                    where: { id: req.user.id },
                    attributes: ['id', 'fullName', 'email'] // Only select needed fields
                });

                const cart = await Cart.findOne({
                    where: { userId: req.user.id },
                    include: [{
                        model: CartItem,
                        attributes: ['quantity']
                    }]
                });

                if (cart) {
                    cartCount = cart.CartItems.reduce((sum, item) => sum + item.quantity, 0);
                }
            }

            res.render('user/products', {
                products,
                categories,
                cartCount,
                isLoggedIn,
                user
            });
        } catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).send('Error fetching products');
        }
    }

    async getProductById(req, res) {
        try {
            const product = await Product.findByPk(req.params.id, {
                include: [{
                    model: Category,
                    attributes: ['name']
                }]
            });

            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            res.json(product);
        } catch (error) {
            console.error('Error fetching product:', error);
            res.status(500).send('Error fetching product');
        }
    }

    async createProduct(req, res) {
        try {
            // Verify if user is admin
            if (!req.user || !req.user.isAdmin) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }

            const { name, description, price, stock, categoryId } = req.body;
            const image = req.file ? `/uploads/${req.file.filename}` : null;

            const product = await Product.create({
                name,
                description,
                price,
                stock,
                categoryId,
                image
            });

            res.status(201).json(product);
        } catch (error) {
            console.error('Error creating product:', error);
            res.status(500).send('Error creating product');
        }
    }

    async updateProduct(req, res) {
        try {
            // Verify if user is admin
            if (!req.user || !req.user.isAdmin) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }

            const { name, description, price, stock, categoryId } = req.body;
            const product = await Product.findByPk(req.params.id);

            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            const image = req.file ? `/uploads/${req.file.filename}` : product.image;

            await product.update({
                name,
                description,
                price,
                stock,
                categoryId,
                image
            });

            res.json(product);
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).send('Error updating product');
        }
    }

    async deleteProduct(req, res) {
        try {
            // Verify if user is admin
            if (!req.user || !req.user.isAdmin) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }

            const product = await Product.findByPk(req.params.id);
            
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            await product.destroy();
            res.json({ message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Error deleting product:', error);
            res.status(500).send('Error deleting product');
        }
    }
}

module.exports = new ProductController();