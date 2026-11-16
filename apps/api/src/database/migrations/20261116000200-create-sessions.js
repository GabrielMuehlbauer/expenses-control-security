'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sessions', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      csrfHash: { type: Sequelize.STRING(64), allowNull: false }, expiresAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false }, updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('sessions', ['expiresAt']);
    await queryInterface.addIndex('sessions', ['userId']);
  },
  async down(queryInterface) { await queryInterface.dropTable('sessions'); }
};
