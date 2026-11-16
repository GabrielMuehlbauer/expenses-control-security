const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32 || new Set(secret).size < 12) throw new Error('JWT_SECRET deve conter um segredo aleatorio de pelo menos 32 bytes. Consulte .env.example.');
const ttl = Number(process.env.SESSION_TTL_SECONDS || 3600);
if (!Number.isInteger(ttl) || ttl < 60 || ttl > 86400) throw new Error('SESSION_TTL_SECONDS deve estar entre 60 e 86400.');
const production = process.env.NODE_ENV === 'production';
const origins = (process.env.WEB_ORIGINS || 'http://localhost:5173').split(',').map(value => value.trim());
for (const origin of origins) {
  const url = new URL(origin);
  if (url.origin !== origin || (production && url.protocol !== 'https:')) throw new Error('WEB_ORIGINS deve conter origens validas; use HTTPS em producao.');
}
module.exports = {
  jwt: { secret, expiresIn: ttl, issuer: 'expenses-control-security', audience: 'expenses-control-web' }, ttl, origins,
  cookieSecret: crypto.createHmac('sha256', secret).update('expenses-control-csrf-cookie').digest('hex'),
  sessionCookie: production ? '__Secure-ec_session' : 'ec_session', csrfCookie: production ? '__Secure-ec_csrf' : 'ec_csrf',
  cookieOptions: { httpOnly: true, secure: production, sameSite: 'lax', path: '/api' }
};
