const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');
const Receipt = sequelize.define('receipt', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  entryId: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'expenses', key: 'id' }, onDelete: 'CASCADE' },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  storageName: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  originalName: { type: DataTypes.STRING(120), allowNull: false },
  mimeType: { type: DataTypes.STRING(30), allowNull: false },
  size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }
});
module.exports = { Receipt };
