'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Categories', [
      {
        name: 'Electronics',
        description: 'Devices and gadgets',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Books',
        description: 'Books and reading materials',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Categories', null, {});
  },
};
