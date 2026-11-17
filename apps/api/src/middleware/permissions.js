const { httpError } = require('../utils/errors');
const ALL = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ATTACH'];
function permissionsFor(user) {
  if (!user.parentId) return [...ALL];
  let permissions = user.permissions;
  if (typeof permissions === 'string') { try { permissions = JSON.parse(permissions); } catch { return []; } }
  return Array.isArray(permissions) ? permissions.filter(value => ALL.includes(value)) : [];
}
function requirePermission(permission) {
  return (req, _res, next) => {
    const permissions = permissionsFor(req.user);
    if (!permissions.includes('VIEW') || !permissions.includes(permission)) throw httpError(403, 'Voce nao tem permissao para esta funcionalidade.');
    next();
  };
}
function parentOnly(req, _res, next) {
  if (req.user.parentId) throw httpError(403, 'Somente o responsavel pode gerenciar contas de filhos.');
  next();
}
async function accountScope(req, _res, next) {
  const { User } = require('../models/user');
  const selected = req.get('x-account-id');
  req.accountId = req.user.id;
  if (selected && selected !== req.user.id) {
    if (req.user.parentId || !/^[0-9a-f-]{36}$/i.test(selected)) throw httpError(403, 'Conta nao autorizada.');
    const child = await User.findOne({ where: { id: selected, parentId: req.user.id }, attributes: ['id'] });
    if (!child) throw httpError(403, 'Conta nao autorizada.');
    req.accountId = child.id;
  }
  next();
}
module.exports = { ALL, permissionsFor, requirePermission, parentOnly, accountScope };
