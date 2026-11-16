'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const indexes = await queryInterface.showIndex('categories');
    for (const index of indexes) {
      if (index.unique && !index.primary && index.fields.length === 1 && index.fields[0].attribute === 'name') await queryInterface.removeIndex('categories', index.name);
    }
    await queryInterface.addIndex('categories', ['userId', 'name'], { unique: true, name: 'user_category_name' });
    const keys = await queryInterface.getForeignKeyReferencesForTable('expenses');
    for (const key of keys) if (key.columnName === 'categoryId') await queryInterface.removeConstraint('expenses', key.constraintName);
    await queryInterface.changeColumn('expenses', 'amount', { type: Sequelize.DECIMAL(12, 2), allowNull: false });
    await queryInterface.changeColumn('expenses', 'date', { type: Sequelize.DATEONLY, allowNull: false });
    await queryInterface.addConstraint('expenses', { fields: ['categoryId'], type: 'foreign key', name: 'expenses_category_restrict', references: { table: 'categories', field: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
    await queryInterface.addIndex('expenses', ['userId', 'date'], { name: 'expenses_user_date' });
  },
  async down() { throw new Error('Migracao financeira nao tem reversao automatica: restaure o backup validado.'); }
};
