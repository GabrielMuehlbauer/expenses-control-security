const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
if (process.env.NODE_ENV !== 'test' || !/^[a-zA-Z0-9_]+_test$/.test(process.env.MYSQL_DATABASE || '')) throw new Error('Use o ambiente de testes.');
test('migration atualiza dados legados sem perder identidade, centavos ou data civil', async () => {
  const database = `security_upgrade_${crypto.randomBytes(6).toString('hex')}_test`;
  const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD });
  let sequelize;
  try {
    await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    sequelize = new Sequelize(database, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, { dialect: 'mysql', host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT), logging: false, timezone: '+00:00' });
    const queryInterface = sequelize.getQueryInterface();
    for (const file of ['20260629192350-create-users', '20260629193218-create-categories', '20260630192515-create-expenses']) await require(`../src/database/migrations/${file}`).up(queryInterface, Sequelize);
    const first = crypto.randomUUID(), second = crypto.randomUUID(), category = crypto.randomUUID(), expense = crypto.randomUUID();
    const timestamps = { createdAt: new Date(), updatedAt: new Date() };
    await queryInterface.bulkInsert('users', [first, second].map((id, index) => ({ id, name: 'Usuario legado', email: `legacy-${index}@example.com`, password: 'legacy-hash-preserved', role: 'user', ...timestamps })));
    await queryInterface.bulkInsert('categories', [{ id: category, name: 'Categoria legada', userId: first, ...timestamps }]);
    await queryInterface.bulkInsert('expenses', [{ id: expense, userId: first, categoryId: category, title: 'Despesa legada', amount: 12.345, date: new Date('2026-01-10T12:00:00Z'), description: 'Preservada', status: 'PAGA', ...timestamps }]);
    await sequelize.query('CREATE TABLE `SequelizeMeta` (`name` VARCHAR(255) NOT NULL PRIMARY KEY)');
    for (const name of ['20260629192350-create-users.js', '20260629193218-create-categories.js', '20260630192515-create-expenses.js']) await sequelize.query('INSERT INTO `SequelizeMeta` (`name`) VALUES (:name)', { replacements: { name } });
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = spawnSync(process.execPath, [path.resolve(__dirname, '../src/database/migrate.js')], { env: { ...process.env, MYSQL_DATABASE: database }, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    const [[row]] = await sequelize.query('SELECT * FROM expenses');
    assert.equal(row.id, expense); assert.equal(row.userId, first); assert.equal(row.categoryId, category);
    assert.equal(row.amount, '12.35'); assert.equal(row.date, '2026-01-10'); assert.equal(row.description, 'Preservada');
    await queryInterface.bulkInsert('categories', [{ id: crypto.randomUUID(), name: 'Categoria legada', userId: second, ...timestamps }]);
    await assert.rejects(queryInterface.bulkDelete('categories', { id: category }), error => error.name === 'SequelizeForeignKeyConstraintError');
    const [[user]] = await sequelize.query('SELECT password FROM users WHERE id = ?', { replacements: [first] });
    assert.equal(user.password, 'legacy-hash-preserved');
  } finally {
    if (sequelize) await sequelize.close();
    // Somente o banco com nome aleatorio criado por este teste e removido.
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await connection.end();
  }
});
