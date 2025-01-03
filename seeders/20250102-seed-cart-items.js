'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('CartItems', [
      {
        cartId: 1, // Sesuaikan dengan ID cart
        productId: 1, // Sesuaikan dengan ID produk
        quantity: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('CartItems', null, {});
  },
};
