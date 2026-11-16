const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('./database');
const { httpError } = require('../utils/errors');
const User = sequelize.define('user', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true, len: [3, 120] } },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true, len: [3, 254] } },
  password: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
  role: { type: DataTypes.STRING, defaultValue: 'user', allowNull: false }
}, { defaultScope: { attributes: { exclude: ['password'] } }, scopes: { withPassword: { attributes: {} } } });
User.beforeSave(async user => {
  if (!user.changed('password')) return;
  if (typeof user.password !== 'string' || user.password.length < 12 || Buffer.byteLength(user.password) > 72) throw httpError(400, 'Senha deve ter pelo menos 12 caracteres e no maximo 72 bytes.');
  user.password = await bcrypt.hash(user.password, 12);
});
async function create(name, email, password) { return User.create({ name, email, password, role: 'user' }); }
async function getByEmail(email) { return User.scope('withPassword').findOne({ where: { email } }); }
module.exports = { User, create, getByEmail };
