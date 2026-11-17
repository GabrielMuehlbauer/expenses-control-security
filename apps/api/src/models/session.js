const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');
const Session = sequelize.define('session', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  csrfHash: { type: DataTypes.STRING(64), allowNull: false }, expiresAt: { type: DataTypes.DATE, allowNull: false }
}, { indexes: [{ fields: ['expiresAt'] }, { fields: ['userId'] }] });
module.exports = { Session };
