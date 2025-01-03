'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Users', [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'hashed_password', // Ganti dengan password yang di-hash
        role: 'admin',
        fullName: 'Admin User',
        address: 'Admin Street',
        phone: '123456789',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        username: 'user1',
        email: 'user1@example.com',
        password: 'hashed_password', // Ganti dengan password yang di-hash
        role: 'user',
        fullName: 'User One',
        address: 'User Street 1',
        phone: '987654321',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {});
  },
};
