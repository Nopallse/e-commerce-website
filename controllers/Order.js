const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');

class OrderController {
    async getAllOrders(req, res) {
        try {
            const user = await User.findOne({ 
                where: { id: req.user.id },
                attributes: ['id', 'fullName', 'email']
            });

            const orders = await Order.findAll({
                where: { userId: req.user.id },
                include: [{
                    model: OrderItem,
                    include: [Product]
                }],
                order: [['createdAt', 'DESC']]
            });

            res.render('user/orders', {
                orders,
                user,
                isLoggedIn: true
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).send('Error fetching orders');
        }
    }

    async getOrderDetails(req, res) {
        try {
            const order = await Order.findOne({
                where: { 
                    id: req.params.id,
                    userId: req.user.id 
                },
                include: [{
                    model: OrderItem,
                    include: [Product]
                }]
            });

            if (!order) {
                return res.status(404).send('Order not found');
            }

            const user = await User.findOne({ 
                where: { id: req.user.id },
                attributes: ['id', 'fullName', 'email']
            });

            res.render('user/orders-detail', {
                order,
                user,
                isLoggedIn: true
            });
        } catch (error) {
            console.error('Error fetching order details:', error);
            res.status(500).send('Error fetching order details');
        }
    }

    async getOrderConfirmation(req, res) {
        try {
            const order = await Order.findOne({
                where: { 
                    id: req.params.id,
                    userId: req.user.id 
                },
                include: [{
                    model: OrderItem,
                    include: [Product]
                }]
            });

            if (!order) {
                return res.status(404).send('Order not found');
            }

            const user = await User.findOne({ 
                where: { id: req.user.id },
                attributes: ['id', 'fullName', 'email']
            });

            res.render('orders/confirmation', {
                order,
                user,
                isLoggedIn: true
            });
        } catch (error) {
            console.error('Error fetching order confirmation:', error);
            res.status(500).send('Error fetching order confirmation');
        }
    }

    async updateOrderStatus(req, res) {
        try {
            const { status } = req.body;
            const order = await Order.findByPk(req.params.id);

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Only admin can update order status
            if (!req.user.isAdmin) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            await order.update({ status });
            res.json({ message: 'Order status updated' });
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({ message: 'Error updating order status' });
        }
    }

    async updatePaymentStatus(req, res) {
        try {
            const { paymentStatus } = req.body;
            const order = await Order.findByPk(req.params.id);

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Only admin can update payment status
            if (!req.user.isAdmin) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            await order.update({ paymentStatus });
            res.json({ message: 'Payment status updated' });
        } catch (error) {
            console.error('Error updating payment status:', error);
            res.status(500).json({ message: 'Error updating payment status' });
        }
    }
}

module.exports = new OrderController();