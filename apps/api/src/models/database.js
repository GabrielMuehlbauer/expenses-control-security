const { Sequelize } = require('sequelize');
const configs = require('../config/database');
const environment = process.env.NODE_ENV || 'development';
if (!configs[environment]) throw new Error('NODE_ENV invalido.');
const sequelize = new Sequelize(configs[environment]);
module.exports = { sequelize };
