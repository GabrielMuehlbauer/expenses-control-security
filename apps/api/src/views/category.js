const controller = require('../controllers/category');
const representation = require('../utils/representation');
const { httpError } = require('../utils/errors');
module.exports = {
  async create(req, res) { const category = await controller.create(req.body.name, req.body.description, req.accountId); res.status(201).json(representation(category, 'categories')); },
  async getAll(req, res) { res.json((await controller.getAll(req.accountId)).map(value => representation(value, 'categories'))); },
  async getById(req, res) {
    const category = await controller.getById(req.params.id, req.accountId);
    if (!category) throw httpError(404, 'Categoria nao encontrada.');
    res.json(representation(category, 'categories'));
  },
  async update(req, res) { res.json(representation(await controller.update(req.params.id, req.body.name, req.body.description, req.accountId), 'categories')); },
  async remove(req, res) { await controller.remove(req.params.id, req.accountId); res.json({ message: 'Categoria excluida com sucesso.' }); }
};
