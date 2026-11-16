const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/auth');
const csrf = require('./middleware/csrf');
const auth = require('./middleware/auth');
const { errorHandler, httpError } = require('./utils/errors');
require('./models/associations');
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"],
  objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
} } }));
app.use((req, res, next) => { req.id = crypto.randomUUID(); res.set('X-Request-Id', req.id); next(); });
app.use(cors({ origin(origin, callback) {
  if (!origin || config.origins.includes(origin)) callback(null, true);
  else callback(httpError(403, 'Origem nao permitida.'));
}, credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-Token'] }));
app.use(express.json({ limit: '16kb', strict: true }));
app.use(cookieParser(config.cookieSecret));
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.get('/api/health', (_req, res) => res.json({ status: 'online' }));
app.get('/api/auth/csrf', csrf.issue);
app.use('/api', csrf.protect, require('./routes/userRoutes'));
app.use('/api', auth);
app.get('/api/auth/session', (req, res) => res.json({ user: req.user }));
app.post('/api/auth/logout', async (req, res) => {
  await req.session.destroy();
  res.clearCookie(config.sessionCookie, config.cookieOptions);
  res.status(204).end();
});
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api', (_req, _res, next) => next(httpError(404, 'Rota nao encontrada.')));
const webDirectory = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(path.join(webDirectory, 'index.html'))) {
  app.use(express.static(webDirectory, { index: false }));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(webDirectory, 'index.html')));
} else app.get('/', (_req, res) => res.json({ projeto: 'Expenses Control Security', documentacao: 'https://github.com/GabrielMuehlbauer/expenses-control-security' }));
app.use(errorHandler);
module.exports = app;
