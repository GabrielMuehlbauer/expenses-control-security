const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const config = {
  username: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
  host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306), dialect: 'mysql',
  timezone: '+00:00', logging: false, define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
};
if (!config.username || !config.database || config.password === undefined) throw new Error('Configure MYSQL_USER, MYSQL_DATABASE e MYSQL_PASSWORD.');
if (process.env.NODE_ENV === 'test' && !config.database.endsWith('_test')) throw new Error('O banco de testes deve terminar em _test.');
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('MYSQL_PORT invalida.');
module.exports = { development: config, test: config, production: config };
