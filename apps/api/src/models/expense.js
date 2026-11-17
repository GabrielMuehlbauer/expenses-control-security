const { Op, DataTypes } = require('sequelize');
const { sequelize } = require('./database');
const { Category } = require('./category');
const { httpError } = require('../utils/errors');
const Expense = sequelize.define('expense', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  categoryId: { type: DataTypes.UUID, allowNull: false, references: { model: 'categories', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('PENDENTE', 'PAGA'), allowNull: false, defaultValue: 'PENDENTE' },
  type: { type: DataTypes.ENUM('EXPENSE', 'INCOME'), allowNull: false, defaultValue: 'EXPENSE' }
}, { indexes: [{ fields: ['userId', 'date'] }] });
function create(title, amount, categoryId, date, description, userId, status, type = 'EXPENSE') { return Expense.create({ title, amount, categoryId, date, description, userId, status, type }); }
function getAll(userId, filters = {}) {
  const where = { userId };
  for (const key of ['status', 'categoryId', 'type']) if (filters[key]) where[key] = filters[key];
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.amount = {};
    if (filters.minAmount !== undefined) where.amount[Op.gte] = filters.minAmount;
    if (filters.maxAmount !== undefined) where.amount[Op.lte] = filters.maxAmount;
  }
  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) where.date[Op.gte] = filters.startDate;
    if (filters.endDate) where.date[Op.lte] = filters.endDate;
  }
  return Expense.findAll({ where, order: [['date', 'DESC'], ['createdAt', 'DESC']] });
}
async function getTotal(userId) {
  const [row] = await Expense.findAll({ where: { userId, type: 'EXPENSE' }, attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']], raw: true });
  return row.total || '0.00';
}
function getCount(userId) { return Expense.count({ where: { userId } }); }
function getByCategory(userId) {
  return Expense.findAll({ where: { userId, type: 'EXPENSE' }, attributes: ['categoryId', [sequelize.fn('SUM', sequelize.col('amount')), 'total'], [sequelize.col('category.name'), 'categoryName']],
    include: [{ model: Category, as: 'category', attributes: [] }], group: ['categoryId', 'category.id', 'category.name'], raw: true });
}
async function getById(id, userId) {
  const expense = await Expense.findOne({ where: { id, userId } });
  if (!expense) throw httpError(404, 'Despesa nao encontrada.');
  return expense;
}
async function update(id, values, userId) { const expense = await getById(id, userId); return expense.update(values); }
async function remove(id, userId) { const expense = await getById(id, userId); await expense.destroy(); }
async function summary(userId) {
  const rows = await Expense.findAll({ where: { userId, status: 'PAGA' }, attributes: ['type', [sequelize.fn('SUM', sequelize.col('amount')), 'total']], group: ['type'], raw: true });
  const received = String(rows.find(row => row.type === 'INCOME')?.total || '0.00');
  const paid = String(rows.find(row => row.type === 'EXPENSE')?.total || '0.00');
  const cents = value => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')); };
  const difference = cents(received) - cents(paid), absolute = difference < 0n ? -difference : difference;
  return { received, paid, balance: `${difference < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}` };
}
module.exports = { Expense, create, getAll, getTotal, getCount, getByCategory, getById, update, remove, summary };
