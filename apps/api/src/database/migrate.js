const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Sequelize, QueryTypes } = require('sequelize');
const { sequelize } = require('../models/database');

// Mantem os nomes e a tabela de controle usados pelo sequelize-cli original.
async function migrate() {
  const connection = await sequelize.connectionManager.getConnection();
  const lockName = `ec:${crypto.createHash('sha256').update(sequelize.config.database).digest('hex').slice(0, 48)}`;
  let locked = false;
  try {
    const [lock] = await sequelize.query('SELECT GET_LOCK(:name, 30) AS acquired', { replacements: { name: lockName }, connection, type: QueryTypes.SELECT });
    if (Number(lock.acquired) !== 1) throw new Error('Outra migracao esta em andamento.');
    locked = true;
    await sequelize.query('CREATE TABLE IF NOT EXISTS `SequelizeMeta` (`name` VARCHAR(255) NOT NULL PRIMARY KEY) ENGINE=InnoDB');
    const applied = new Set((await sequelize.query('SELECT name FROM `SequelizeMeta`', { type: QueryTypes.SELECT })).map(row => row.name));
    const directory = path.join(__dirname, 'migrations');
    for (const file of fs.readdirSync(directory).filter(file => /^\d+-[\w-]+\.js$/.test(file)).sort()) {
      if (applied.has(file)) continue;
      await require(path.join(directory, file)).up(sequelize.getQueryInterface(), Sequelize);
      await sequelize.query('INSERT INTO `SequelizeMeta` (`name`) VALUES (:name)', { replacements: { name: file } });
      console.log(`Migration aplicada: ${file}`);
    }
  } finally {
    if (locked) await sequelize.query('SELECT RELEASE_LOCK(:name)', { replacements: { name: lockName }, connection });
    await sequelize.connectionManager.releaseConnection(connection);
  }
}
if (require.main === module) migrate().catch(() => { console.error('Falha nas migrations. Verifique o banco e o procedimento de restauracao em docs/arquitetura.md.'); process.exitCode = 1; }).finally(() => sequelize.close());
module.exports = { migrate };
