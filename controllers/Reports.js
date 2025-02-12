const { Order, User, OrderItem, Product } = require("../models");
const { Op } = require("sequelize");
const { patch } = require("../routes/admin");

const getDailyOrdersReport = async (req, res) => {
    try {
        // Get selected date from query or use current date
        const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
        
        // Create date range for the selected date
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        // Fetch all orders for the selected date
        const orders = await Order.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: User,
                    attributes: ['fullName']
                },
                {
                    model: OrderItem,
                    include: [{
                        model: Product,
                        attributes: ['name']
                    }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Calculate daily statistics
        const dailyStats = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
            completedOrders: orders.filter(order => order.status === 'Selesai').length,
            averageOrderValue: orders.length > 0 
                ? orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / orders.length 
                : 0
        };

        // Calculate hourly order distribution
        const hourlyStats = calculateHourlyStats(orders);

        // Calculate product statistics
        const productStats = await calculateProductStats(orders);

        res.render('admin/reports/daily-orders', {
            path: '/reports',
            selectedDate,
            dailyStats,
            hourlyStats,
            productStats,
            orders,
            title: 'Daily Orders Report',
        });

    } catch (error) {
        console.error('Error generating daily report:', error);
        res.status(500).send('Error generating report');
    }
};

// Helper function to calculate hourly order distribution
const calculateHourlyStats = (orders) => {
    // Initialize arrays for labels and data
    const labels = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const data = new Array(24).fill(0);

    // Count orders for each hour
    orders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        data[hour]++;
    });

    return { labels, data };
};

// Helper function to calculate product statistics
const calculateProductStats = async (orders) => {
    // Create a map to store product statistics
    const productMap = new Map();

    // Process all order items
    orders.forEach(order => {
        order.OrderItems.forEach(item => {
            const productId = item.productId;
            const productName = item.Product.name;
            const quantity = item.quantity;
            const revenue = Number(item.price) * quantity;

            if (productMap.has(productId)) {
                const product = productMap.get(productId);
                product.quantity += quantity;
                product.revenue += revenue;
                product.orderCount++;
            } else {
                productMap.set(productId, {
                    name: productName,
                    quantity: quantity,
                    revenue: revenue,
                    orderCount: 1
                });
            }
        });
    });

    // Convert map to array and sort by revenue
    return Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Get top 5 products
};

// Helper function to get status distribution
const getStatusDistribution = (orders) => {
    const statusCounts = {};
    orders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    return statusCounts;
};

const getMonthlyOrdersReport = async (req, res) => {
    try {
        // Get selected month from query or use current month
        const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7);
        const [year, month] = selectedMonth.split('-');
        
        // Create date range for the selected month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        
        // Create date range for previous month (for comparison)
        const prevStartDate = new Date(year, month - 2, 1);
        const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);

        // Fetch orders for current month
        const orders = await Order.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: User,
                    attributes: ['fullName']
                },
                {
                    model: OrderItem,
                    include: [{
                        model: Product,
                        attributes: ['name']
                    }]
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        // Fetch orders for previous month
        const prevMonthOrders = await Order.findAll({
            where: {
                createdAt: {
                    [Op.between]: [prevStartDate, prevEndDate]
                }
            }
        });

        // Calculate monthly statistics
        const monthlyStats = await calculateMonthlyStats(orders, prevMonthOrders);

        // Calculate daily order distribution
        const dailyStats = calculateDailyStats(orders, year, month);

        // Calculate status distribution
        const statusDistribution = calculateStatusDistribution(orders);

        // Calculate top products
        const topProducts = await calculateTopProducts(orders);

        res.render('admin/reports/monthly-orders', {
            path: '/reports',
            selectedMonth,
            monthlyStats,
            dailyStats,
            statusDistribution,
            orders,
            title: 'Monthly Orders Report',
        });

    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).send('Error generating report');
    }
};

// Helper function to calculate monthly statistics
const calculateMonthlyStats = async (orders, prevMonthOrders) => {
    const totalOrders = orders.length;
    const prevTotalOrders = prevMonthOrders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const prevTotalRevenue = prevMonthOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // Calculate growth percentages
    const orderGrowth = prevTotalOrders === 0 ? 100 : 
        ((totalOrders - prevTotalOrders) / prevTotalOrders * 100).toFixed(1);
    const revenueGrowth = prevTotalRevenue === 0 ? 100 : 
        ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(1);

    // Calculate completion rate
    const completedOrders = orders.filter(order => order.status === 'Selesai').length;
    const completionRate = totalOrders === 0 ? 0 : 
        ((completedOrders / totalOrders) * 100).toFixed(1);

    return {
        totalOrders,
        totalRevenue,
        averageOrderValue: totalOrders === 0 ? 0 : totalRevenue / totalOrders,
        orderGrowth,
        revenueGrowth,
        completionRate
    };
};

// Helper function to calculate daily statistics
const calculateDailyStats = (orders, year, month) => {
    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Initialize arrays for labels and data
    const labels = Array.from({length: daysInMonth}, (_, i) => `${i + 1}`);
    const data = new Array(daysInMonth).fill(0);

    // Count orders for each day
    orders.forEach(order => {
        const day = new Date(order.createdAt).getDate();
        data[day - 1]++;
    });

    return { labels, data };
};

// Helper function to calculate status distribution
const calculateStatusDistribution = (orders) => {
    const distribution = {
        'Belum Bayar': 0,
        'Dikemas': 0,
        'Dikirim': 0,
        'Selesai': 0,
        'Dibatalkan': 0
    };

    orders.forEach(order => {
        distribution[order.status]++;
    });

    return distribution;
};

// Helper function to calculate top products
const calculateTopProducts = async (orders) => {
    const productMap = new Map();

    // Process all order items
    orders.forEach(order => {
        order.OrderItems.forEach(item => {
            const productId = item.productId;
            const productName = item.Product.name;
            const quantity = item.quantity;
            const revenue = Number(item.price) * quantity;

            if (productMap.has(productId)) {
                const product = productMap.get(productId);
                product.quantity += quantity;
                product.revenue += revenue;
                product.orderCount++;
            } else {
                productMap.set(productId, {
                    name: productName,
                    quantity: quantity,
                    revenue: revenue,
                    orderCount: 1
                });
            }
        });
    });

    // Convert map to array and sort by revenue
    return Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Get top 10 products
};

// Helper function to get revenue by product category
const getRevenueByCategory = async (orders) => {
    const categoryRevenue = new Map();

    for (const order of orders) {
        for (const item of order.OrderItems) {
            const product = await Product.findByPk(item.productId);
            const category = product.category || 'Uncategorized';
            const revenue = Number(item.price) * item.quantity;

            categoryRevenue.set(category, 
                (categoryRevenue.get(category) || 0) + revenue
            );
        }
    }

    return Object.fromEntries(categoryRevenue);
};





const getYearlyOrdersReport = async (req, res) => {
    try {
        // Get selected year from query or use current year
        const selectedYear = req.query.year || new Date().getFullYear();
        
        // Create date range for the selected year
        const startDate = new Date(selectedYear, 0, 1);
        const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        
        // Create date range for previous year (for comparison)
        const prevStartDate = new Date(selectedYear - 1, 0, 1);
        const prevEndDate = new Date(selectedYear - 1, 11, 31, 23, 59, 59, 999);

        // Fetch orders for current year
        const orders = await Order.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: User,
                    attributes: ['fullName']
                },
                {
                    model: OrderItem,
                    include: [{
                        model: Product,
                        attributes: ['name']
                    }]
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        // Fetch orders for previous year
        const prevYearOrders = await Order.findAll({
            where: {
                createdAt: {
                    [Op.between]: [prevStartDate, prevEndDate]
                }
            }
        });

        // Calculate yearly statistics
        const yearlyStats = await calculateYearlyStats(orders, prevYearOrders);

        // Calculate monthly order distribution
        const monthlyStats = calculateMonthlyStat(orders);

        // Calculate status distribution
        const statusDistribution = calculateStatusDistributions(orders);

        // Calculate top products
        const topProducts = await calculateTopProduct(orders);

        res.render('admin/reports/yearly-orders', {
            path: '/reports',
            selectedYear,
            yearlyStats,
            monthlyStats,
            statusDistribution,
            topProducts,
            title: 'Yearly Orders Report',
        });

    } catch (error) {
        console.error('Error generating yearly report:', error);
        res.status(500).send('Error generating report');
    }
};
const calculateYearlyStats = async (orders, prevYearOrders) => {
    const totalOrders = orders.length;
    const prevTotalOrders = prevYearOrders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const prevTotalRevenue = prevYearOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // Calculate growth percentages
    const orderGrowth = prevTotalOrders === 0 ? 100 : 
        ((totalOrders - prevTotalOrders) / prevTotalOrders * 100).toFixed(1);
    const revenueGrowth = prevTotalRevenue === 0 ? 100 : 
        ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(1);

    // Calculate completion rate
    const completedOrders = orders.filter(order => order.status === 'Selesai').length;
    const completionRate = totalOrders === 0 ? 0 : 
        ((completedOrders / totalOrders) * 100).toFixed(1);

    return {
        totalOrders,
        totalRevenue,
        averageOrderValue: totalOrders === 0 ? 0 : Math.round(totalRevenue / totalOrders),
        orderGrowth,
        revenueGrowth,
        completionRate
    };
};

// Helper function to calculate monthly statistics
const calculateMonthlyStat = (orders) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Initialize arrays for labels and data
    const labels = months;
    const data = new Array(12).fill(0);

    // Count orders for each month
    orders.forEach(order => {
        const month = new Date(order.createdAt).getMonth();
        data[month]++;
    });

    return { labels, data };
};

// Helper function to calculate status distribution
const calculateStatusDistributions = (orders) => {
    const distribution = {
        'Belum Bayar': 0,
        'Dikemas': 0,
        'Dikirim': 0,
        'Selesai': 0,
        'Dibatalkan': 0
    };

    orders.forEach(order => {
        distribution[order.status]++;
    });

    return distribution;
};

// Helper function to calculate top products
const calculateTopProduct = async (orders) => {
    const productMap = new Map();

    // Process all order items
    orders.forEach(order => {
        order.OrderItems.forEach(item => {
            const productId = item.productId;
            const productName = item.Product.name;
            const quantity = item.quantity;
            const revenue = Number(item.price) * quantity;

            if (productMap.has(productId)) {
                const product = productMap.get(productId);
                product.quantity += quantity;
                product.revenue += revenue;
                product.orderCount++;
            } else {
                productMap.set(productId, {
                    name: productName,
                    quantity: quantity,
                    revenue: revenue,
                    orderCount: 1
                });
            }
        });
    });

    // Convert map to array and sort by revenue
    return Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Get top 10 products
};




module.exports = {
    getDailyOrdersReport,
    getMonthlyOrdersReport,
    getYearlyOrdersReport
};