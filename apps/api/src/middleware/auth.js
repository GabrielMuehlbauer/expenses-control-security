const jwt = require('jsonwebtoken');
const { Session } = require('../models/session');
const { User } = require('../models/user');
const config = require('../config/auth');
const { hash, equal } = require('./csrf');
const { httpError } = require('../utils/errors');
module.exports = async (req, _res, next) => {
  const token = req.cookies[config.sessionCookie];
  if (!token) throw httpError(401, 'Sessao encerrada. Entre novamente.');
  let claims;
  try { claims = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'], issuer: config.jwt.issuer, audience: config.jwt.audience }); }
  catch { throw httpError(401, 'Sessao encerrada. Entre novamente.'); }
  if (typeof claims.sub !== 'string' || typeof claims.jti !== 'string') throw httpError(401, 'Sessao invalida.');
  const session = await Session.findOne({ where: { id: claims.jti, userId: claims.sub } });
  if (!session || session.expiresAt <= new Date()) throw httpError(401, 'Sessao encerrada. Entre novamente.');
  const user = await User.findByPk(claims.sub, { attributes: ['id', 'name', 'email'] });
  if (!user) throw httpError(401, 'Sessao encerrada. Entre novamente.');
  if (req.csrfToken && !equal(hash(req.csrfToken), session.csrfHash)) throw httpError(403, 'Protecao CSRF invalida. Entre novamente.');
  req.user = user; req.session = session; next();
};
