'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('OrderItems', [
      {
        orderId: 1, // Sesuaikan dengan ID order
        productId: 1, // Sesuaikan dengan ID produk
        quantity: 1,
        price: 100.00,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('OrderItems', null, {});
  },
};
