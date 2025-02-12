const { Op } = require('sequelize');
const { Order, User, Product, OrderItem } = require('../models');
const sequelize = require('sequelize');

const dashboardController = {
  // Get dashboard data
  getDashboardData: async (req, res) => {
    try {
      const period = req.query.period || 'today';
      
      // Get date range based on period
      const dateRange = getDateRange(period);
      const previousDateRange = getPreviousDateRange(period);

      // Fetch basic stats
      const stats = await getStats(dateRange, previousDateRange);
      
      // Fetch recent orders
      const recentOrders = await Order.findAll({
        include: [{ model: User, attributes: ['fullName'] }],
        limit: 5,
        order: [['createdAt', 'DESC']]
      });

      // Fetch top products
      const topProducts = await getTopProducts(dateRange);
      


      const orders = await Order.findAll({
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

      // Get chart data
      const statusDistribution = calculateStatusDistribution(orders);


      res.render('admin/dashboard', {
        stats,
        recentOrders,
        topProducts,
        statusDistribution,
        charts: await getChartData(dateRange),
        path : req.path
      });
    } catch (error) {
      console.error('Dashboard Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  // API endpoint for updating dashboard data
  getUpdatedDashboardData: async (req, res) => {
    try {
      const period = req.query.period || 'today';
      const dateRange = getDateRange(period);
      const previousDateRange = getPreviousDateRange(period);

      const stats = await getStats(dateRange, previousDateRange);
      const charts = await getChartData(dateRange);

      res.json({
        success: true,
        data: { stats, charts }
      });
    } catch (error) {
      console.error('Dashboard Update Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
};

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


// Helper function to get date range
function getDateRange(period) {
  const now = new Date();
  const start = new Date();
  
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setHours(0, 0, 0, 0);
  }
  
  return { start, end: now };
}

// Helper function to get previous date range for comparison
function getPreviousDateRange(period) {
  const { start: currentStart, end: currentEnd } = getDateRange(period);
  const duration = currentEnd - currentStart;
  
  const end = new Date(currentStart);
  const start = new Date(end - duration);
  
  return { start, end };
}

// Helper function to get basic stats
async function getStats(dateRange, previousDateRange) {
  // Current period stats
  const currentStats = await Order.findAll({

    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
      [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
    ],
    raw: true
  });

  // Previous period stats for comparison
  const previousStats = await Order.findAll({
    where: {
      createdAt: {
        [Op.between]: [previousDateRange.start, previousDateRange.end]
      }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
      [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
    ],
    raw: true
  });

  // Calculate growth percentages
  const revenueGrowth = calculateGrowthPercentage(
    previousStats[0].revenue,
    currentStats[0].revenue
  );
  
  const orderGrowth = calculateGrowthPercentage(
    previousStats[0].orderCount,
    currentStats[0].orderCount
  );

  // Get customer stats
  const totalCustomers = await User.count({
    where: { role: 'customer' }
  });

  const newCustomers = await User.count({
    where: {
      role: 'customer',
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      }
    }
  });

  return {
    totalRevenue: currentStats[0].revenue || 0,
    totalOrders: currentStats[0].orderCount || 0,
    averageOrderValue: currentStats[0].orderCount ? 
      (currentStats[0].revenue / currentStats[0].orderCount) : 0,
    totalCustomers,
    newCustomers,
    revenueGrowth,
    orderGrowth
  };
}

// Helper function to get top products
async function getTopProducts(dateRange) {
  return await OrderItem.findAll({
    include: [{
      model: Order,
      where: {
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      },
      attributes: []
    }, {
      model: Product,
      attributes: ['name', 'stock']
    }],
    attributes: [
      'productId',
      [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'soldQuantity'],
      [sequelize.fn('SUM', sequelize.col('OrderItem.price')), 'revenue']
    ],
    group: ['productId', 'Product.name', 'Product.stock'],
    order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
    limit: 5,
    raw: true,
    nest: true
  });
}

// Helper function to get chart data
async function getChartData(dateRange) {
  // Revenue trend data
  const revenueTrend = await Order.findAll({
    attributes: [
      [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
      [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
    ],
    group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
    order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
    raw: true
  });

  // Order status distribution
  const orderStatus = await Order.findAll({
    where: {
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      }
    },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  // Format chart data
  return {
    revenueTrend: {
      labels: revenueTrend.map(item => item.date),
      data: revenueTrend.map(item => item.revenue)
    },
    orderStatus: orderStatus.reduce((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {}),
    // paymentMethods: await getPaymentMethodsData(dateRange),
    customerGrowth: await getCustomerGrowthData(dateRange)
  };
}

// Helper function to calculate growth percentage
function calculateGrowthPercentage(previous, current) {
  if (!previous) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}


// Helper function to get customer growth data
async function getCustomerGrowthData(dateRange) {
  const customerData = await User.findAll({
    where: {
      role: 'customer',
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      }
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
    order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
    raw: true
  });

  return {
    labels: customerData.map(item => item.date),
    data: customerData.map(item => item.count)
  };
}

module.exports = dashboardController;