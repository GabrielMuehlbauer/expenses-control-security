async function main() {
  try {
    const app = require('./app');
    const { sequelize } = require('./models/database');
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT invalida.');
    await sequelize.authenticate();
    const server = app.listen(port, () => console.log(`Expenses Control: http://localhost:${port}`));
    server.on('error', () => { console.error('Nao foi possivel abrir a porta configurada.'); process.exitCode = 1; sequelize.close(); });
    const stop = () => { server.close(() => sequelize.close().then(() => process.exit(0))); setTimeout(() => process.exit(1), 10000).unref(); };
    process.once('SIGTERM', stop); process.once('SIGINT', stop);
  } catch (error) {
    console.error(`Falha ao iniciar: ${error.name.startsWith('Sequelize') ? 'verifique a conexao e as migrations do banco.' : error.message}`);
    process.exitCode = 1;
  }
}
main();
