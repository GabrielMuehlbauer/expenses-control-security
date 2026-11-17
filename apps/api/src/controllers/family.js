const { User, publicUser } = require('../models/user');
const { httpError } = require('../utils/errors');
module.exports = {
  async create(values, parentId) {
    const child = await User.create({ name: values.name, email: values.email, password: values.password, parentId, permissions: values.permissions, role: 'user' });
    return publicUser(child);
  },
  async list(parentId) { return (await User.findAll({ where: { parentId }, order: [['name', 'ASC']] })).map(publicUser); },
  async update(id, parentId, permissions) {
    const child = await User.findOne({ where: { id, parentId } });
    if (!child) throw httpError(404, 'Conta de filho nao encontrada.');
    await child.update({ permissions });
    return publicUser(child);
  }
};
