const { httpError } = require('../utils/errors');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message) { throw httpError(400, message); }
function text(value, label, min = 1, max = 255) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(`${label}: informe entre ${min} e ${max} caracteres.`);
  return value.trim();
}
function id(value) { if (typeof value !== 'string' || !uuidPattern.test(value)) fail('Identificador invalido.'); return value; }
function money(value, allowZero = false) {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(String(value))) fail('Valor invalido: use ate duas casas decimais.');
  if (!Number.isFinite(Number(value)) || Number(value) < (allowZero ? 0 : 0.01)) fail('O valor deve ser maior que zero.');
  return Number(value).toFixed(2);
}
function date(value, allowFuture = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Data invalida. Use AAAA-MM-DD.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value < '1900-01-01') fail('Data invalida.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.BUSINESS_TIMEZONE || 'America/Sao_Paulo' }).format(new Date());
  if (!allowFuture && value > today) fail('A data da despesa nao pode ser no futuro.');
  return value;
}
function status(value) { if (!['PAGA', 'PENDENTE'].includes(value)) fail('Status deve ser PAGA ou PENDENTE.'); return value; }
function bodyObject(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Corpo JSON invalido.');
  if (Object.keys(body).some(key => !allowed.includes(key))) fail('A requisicao possui campos nao permitidos.');
}
function credentials(body, registration) {
  bodyObject(body, registration ? ['name', 'email', 'password'] : ['email', 'password']);
  const email = text(body.email, 'E-mail', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('E-mail invalido.');
  const password = body.password;
  if (typeof password !== 'string' || password.length < (registration ? 12 : 1) || Buffer.byteLength(password, 'utf8') > 72) fail('Senha: use pelo menos 12 caracteres e no maximo 72 bytes.');
  return { ...(registration ? { name: text(body.name, 'Nome', 3, 120) } : {}), email, password };
}
function category(body) {
  bodyObject(body, ['name', 'description']);
  return { name: text(body.name, 'Nome', 1, 100), description: body.description === undefined ? '' : text(body.description, 'Descricao', 0, 255) };
}
function expense(body, partial = false) {
  const fields = ['title', 'amount', 'categoryId', 'date', 'description', 'status'];
  bodyObject(body, fields);
  if (partial && Object.keys(body).length === 0) fail('Informe algum campo para atualizar.');
  const result = {};
  for (const key of fields) {
    if (partial && !Object.hasOwn(body, key)) continue;
    const value = body[key];
    if (key === 'title') result.title = text(value, 'Titulo', 1, 150);
    if (key === 'amount') result.amount = money(value);
    if (key === 'categoryId') result.categoryId = id(value);
    if (key === 'date') result.date = date(value);
    if (key === 'description') result.description = value === undefined ? '' : text(value, 'Descricao', 0, 255);
    if (key === 'status') result.status = value === undefined ? 'PENDENTE' : status(value);
  }
  return result;
}
function filters(query) {
  bodyObject(query, ['status', 'categoryId', 'minAmount', 'maxAmount', 'startDate', 'endDate']);
  const result = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === 'status') result[key] = status(value);
    else if (key === 'categoryId') result[key] = id(value);
    else if (key.endsWith('Amount')) result[key] = money(value, true);
    else result[key] = date(value, true);
  }
  if (result.minAmount && result.maxAmount && Number(result.minAmount) > Number(result.maxAmount)) fail('Intervalo de valores invalido.');
  if (result.startDate && result.endDate && result.startDate > result.endDate) fail('Intervalo de datas invalido.');
  return result;
}
const validate = parser => (req, _res, next) => { req.body = parser(req.body); next(); };
const validateId = (req, _res, next) => { id(req.params.id); next(); };
module.exports = { credentials, category, expense, filters, validate, validateId, money, date, text };
