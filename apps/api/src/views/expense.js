const controller = require('../controllers/expense');
const representation = require('../utils/representation');
const { filters } = require('../middleware/validation');
module.exports = {
  async create(req, res) {
    const { title, amount, categoryId, date, description, status } = req.body;
    const expense = await controller.create(title, amount, categoryId, date, description, req.user.id, status);
    res.status(201).json({ message: 'Despesa adicionada com sucesso.', expense: representation(expense, 'expenses') });
  },
  async getAll(req, res) { res.json((await controller.getAll(req.user.id, filters(req.query))).map(value => representation(value, 'expenses'))); },
  async getById(req, res) { res.json(representation(await controller.getById(req.params.id, req.user.id), 'expenses')); },
  async update(req, res) { res.json(representation(await controller.update(req.params.id, req.body, req.user.id), 'expenses')); },
  async remove(req, res) { await controller.remove(req.params.id, req.user.id); res.json({ message: 'Despesa excluida com sucesso.' }); }
};
