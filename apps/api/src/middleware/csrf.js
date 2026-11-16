const crypto = require('node:crypto');
const config = require('../config/auth');
const { httpError } = require('../utils/errors');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function equal(left, right) {
  return typeof left === 'string' && typeof right === 'string' && left.length === right.length && crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}
function setCsrf(res, token) { res.cookie(config.csrfCookie, token, { ...config.cookieOptions, signed: true, maxAge: config.ttl * 1000 }); }
function issue(req, res) {
  const existing = req.signedCookies[config.csrfCookie];
  const csrfToken = typeof existing === 'string' && /^[a-f0-9]{64}$/.test(existing) ? existing : crypto.randomBytes(32).toString('hex');
  setCsrf(res, csrfToken);
  res.json({ csrfToken });
}
function protect(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !config.origins.includes(origin)) throw httpError(403, 'Origem nao permitida.');
  if (req.get('sec-fetch-site') === 'cross-site') throw httpError(403, 'Origem nao permitida.');
  const token = req.get('x-csrf-token');
  if (!/^[a-f0-9]{64}$/.test(token || '') || !equal(token, req.signedCookies[config.csrfCookie])) throw httpError(403, 'Protecao CSRF invalida. Atualize a pagina.');
  req.csrfToken = token;
  next();
}
module.exports = { hash, equal, issue, protect, setCsrf };
