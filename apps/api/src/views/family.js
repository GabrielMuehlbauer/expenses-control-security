const controller = require('../controllers/family');
module.exports = {
  async create(req, res) { res.status(201).json(await controller.create(req.body, req.user.id)); },
  async list(req, res) { res.json(await controller.list(req.user.id)); },
  async update(req, res) { res.json(await controller.update(req.params.id, req.user.id, req.body.permissions)); }
};
