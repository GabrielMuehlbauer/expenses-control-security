const ExpenseModel = require('../models/expense');
module.exports = {
  getTotalExpenses: userId => ExpenseModel.getTotal(userId),
  getExpensesCount: userId => ExpenseModel.getCount(userId),
  async getExpensesByCategory(userId) {
    return (await ExpenseModel.getByCategory(userId)).map(row => ({ categoryId: row.categoryId, categoria: row.categoryName, total: row.total }));
  }
};
