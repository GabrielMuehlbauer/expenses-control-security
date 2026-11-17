'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'parentId', { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    await queryInterface.addColumn('users', 'permissions', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.addColumn('expenses', 'type', { type: Sequelize.ENUM('EXPENSE', 'INCOME'), allowNull: false, defaultValue: 'EXPENSE' });
    await queryInterface.createTable('receipts', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      entryId: { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: 'expenses', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      storageName: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      originalName: { type: Sequelize.STRING(120), allowNull: false },
      mimeType: { type: Sequelize.STRING(30), allowNull: false },
      size: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false }, updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('receipts', ['userId']);
  },
  async down() { throw new Error('Restaure um backup validado para reverter a migracao familiar e os comprovantes.'); }
};
