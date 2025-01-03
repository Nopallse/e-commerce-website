'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Products', [
      {
        name: 'Smartphone',
        description: 'A powerful smartphone.',
        price: 500.00,
        stock: 50,
        image: 'smartphone.jpg',
        categoryId: 1, // Sesuaikan dengan ID kategori
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Novel',
        description: 'A bestselling novel.',
        price: 20.00,
        stock: 100,
        image: 'novel.jpg',
        categoryId: 2, // Sesuaikan dengan ID kategori
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Products', null, {});
  },
};
