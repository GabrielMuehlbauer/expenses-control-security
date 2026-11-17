'use strict';
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') throw new Error('Dados de demonstracao nao sao permitidos em producao.');
    const password = process.env.DEMO_PASSWORD;
    if (!password || password.length < 12 || Buffer.byteLength(password) > 72) throw new Error('Configure DEMO_PASSWORD com 12 caracteres ou mais, ate 72 bytes.');
    const [existing] = await queryInterface.sequelize.query("SELECT id FROM users WHERE email = 'admin@expensescontrol.com'");
    if (existing.length) return;
    await queryInterface.bulkInsert('users', [{ id: crypto.randomUUID(), name: 'Administrador', email: 'admin@expensescontrol.com', password: await bcrypt.hash(password, 12), role: 'admin', createdAt: new Date(), updatedAt: new Date() }]);
  },
  async down(queryInterface) { await queryInterface.bulkDelete('users', { email: 'admin@expensescontrol.com' }); }
};
