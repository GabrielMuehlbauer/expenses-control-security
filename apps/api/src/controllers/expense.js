const ExpenseModel = require('../models/expense');
const CategoryModel = require('../models/category');
const { httpError } = require('../utils/errors');
class ExpenseController {
  async create(title, amount, categoryId, date, description, userId, status, type) {
    if (!await CategoryModel.getById(categoryId, userId)) throw httpError(400, 'Categoria invalida.');
    return ExpenseModel.create(title, amount, categoryId, date, description, userId, status, type);
  }
  getAll(userId, filters) { return ExpenseModel.getAll(userId, filters); }
  getById(id, userId) { return ExpenseModel.getById(id, userId); }
  async update(id, values, userId) {
    await ExpenseModel.getById(id, userId);
    if (values.categoryId && !await CategoryModel.getById(values.categoryId, userId)) throw httpError(400, 'Categoria invalida.');
    return ExpenseModel.update(id, values, userId);
  }
  async remove(id, userId) {
    const { sequelize } = require('../models/database');
    const { User } = require('../models/user');
    const { Receipt } = require('../models/receipt');
    let storageName;
    await sequelize.transaction(async transaction => {
      await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      const entry = await ExpenseModel.Expense.findOne({ where: { id, userId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!entry) throw httpError(404, 'Lancamento nao encontrado.');
      const receipt = await Receipt.findOne({ where: { entryId: id, userId }, transaction });
      storageName = receipt?.storageName;
      await entry.destroy({ transaction });
    });
    if (storageName) await require('../utils/receipt-storage').remove(storageName);
  }
}
module.exports = new ExpenseController();
