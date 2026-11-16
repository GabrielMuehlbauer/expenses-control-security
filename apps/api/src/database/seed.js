const { sequelize } = require('../models/database');
const { Sequelize, QueryTypes } = require('sequelize');
async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demonstracao desativada em producao.');
  await require('./seeders/20260630193715-admin-user').up(sequelize.getQueryInterface(), Sequelize);
  const [user] = await sequelize.query('SELECT id FROM users WHERE email = :email', { replacements: { email: 'admin@expensescontrol.com' }, type: QueryTypes.SELECT });
  const [{ total }] = await sequelize.query('SELECT COUNT(*) AS total FROM categories WHERE userId = :userId', { replacements: { userId: user.id }, type: QueryTypes.SELECT });
  if (Number(total) === 0) await require('./seeders/20260630201322-default-categories').up(sequelize.getQueryInterface(), Sequelize);
  console.log('Dados de demonstracao preparados. A senha e a definida em DEMO_PASSWORD.');
}
seed().catch(() => { console.error('Falha ao preparar demonstracao. Verifique DEMO_PASSWORD e o banco.'); process.exitCode = 1; }).finally(() => sequelize.close());
