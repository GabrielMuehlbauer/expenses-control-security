const ExpenseModel = require('../models/expense');
const CategoryModel = require('../models/category');
const { httpError } = require('../utils/errors');
class ExpenseController {
  async create(title, amount, categoryId, date, description, userId, status) {
    if (!await CategoryModel.getById(categoryId, userId)) throw httpError(400, 'Categoria invalida.');
    return ExpenseModel.create(title, amount, categoryId, date, description, userId, status);
  }
  getAll(userId, filters) { return ExpenseModel.getAll(userId, filters); }
  getById(id, userId) { return ExpenseModel.getById(id, userId); }
  async update(id, values, userId) {
    await ExpenseModel.getById(id, userId);
    if (values.categoryId && !await CategoryModel.getById(values.categoryId, userId)) throw httpError(400, 'Categoria invalida.');
    return ExpenseModel.update(id, values, userId);
  }
  remove(id, userId) { return ExpenseModel.remove(id, userId); }
}
module.exports = new ExpenseController();
