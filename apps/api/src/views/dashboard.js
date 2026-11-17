const controller = require('../controllers/dashboard');
module.exports = {
  async getSummary(req, res) { res.json(await controller.getSummary(req.accountId)); },
  async getTotalExpenses(req, res) { res.json({ total: await controller.getTotalExpenses(req.accountId) }); },
  async getExpensesCount(req, res) { res.json({ quantidade: await controller.getExpensesCount(req.accountId) }); },
  async getExpensesByCategory(req, res) { res.json(await controller.getExpensesByCategory(req.accountId)); }
};
