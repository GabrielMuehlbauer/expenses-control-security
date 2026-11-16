const controller = require('../controllers/dashboard');
module.exports = {
  async getTotalExpenses(req, res) { res.json({ total: await controller.getTotalExpenses(req.user.id) }); },
  async getExpensesCount(req, res) { res.json({ quantidade: await controller.getExpensesCount(req.user.id) }); },
  async getExpensesByCategory(req, res) { res.json(await controller.getExpensesByCategory(req.user.id)); }
};
