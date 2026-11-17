const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const jwt = require('jsonwebtoken');
if (process.env.NODE_ENV !== 'test' || !/^[a-zA-Z0-9_]+_test$/.test(process.env.MYSQL_DATABASE || '')) throw new Error('Execute com NODE_ENV=test e banco isolado terminado em _test.');
const app = require('../src/app');
const { sequelize } = require('../src/models/database');
const { User } = require('../src/models/user');
const { Session } = require('../src/models/session');
const { Expense } = require('../src/models/expense');
const { Category } = require('../src/models/category');
const config = require('../src/config/auth');
const password = 'TesteSeguro!123456';
const run = crypto.randomBytes(5).toString('hex');
const ids = [];
let alice, bob, categoryA, categoryB, expenseId;
async function client(email) {
  const agent = request.agent(app);
  const csrf = (await agent.get('/api/auth/csrf').expect(200)).body.csrfToken;
  const signup = await agent.post('/api/users').set('X-CSRF-Token', csrf).send({ name: 'Teste de seguranca', email, password }).expect(201);
  ids.push(signup.body.id);
  const login = await agent.post('/api/auth/login').set('X-CSRF-Token', csrf).send({ email, password }).expect(200);
  return { agent, csrf, id: signup.body.id, email, login, post: (url, body) => agent.post(url).set('X-CSRF-Token', csrf).send(body), put: (url, body) => agent.put(url).set('X-CSRF-Token', csrf).send(body), remove: url => agent.delete(url).set('X-CSRF-Token', csrf) };
}
before(async () => {
  const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
  const migration = spawnSync(process.execPath, [require.resolve('../src/database/migrate')], { cwd: require('node:path').resolve(__dirname, '..'), encoding: 'utf8' });
  assert.equal(migration.status, 0, migration.stdout + migration.stderr);
  alice = await client(`security-${run}-a@example.com`);
  bob = await client(`security-${run}-b@example.com`);
});
after(async () => {
  if (ids.length) {
    await Expense.destroy({ where: { userId: ids } });
    await Category.destroy({ where: { userId: ids } });
    await Session.destroy({ where: { userId: ids } });
    await User.destroy({ where: { id: ids } });
  }
  await sequelize.close();
});
test('seguranca e funcionalidades com banco real', async t => {
  await t.test('headers e respostas nao expoem framework ou senha', async () => {
    const response = await alice.agent.get('/api/auth/session').expect(200);
    assert.equal(response.headers['x-powered-by'], undefined);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.body.user.password, undefined);
    assert.equal(alice.login.body.token, undefined);
    const cookie = alice.login.headers['set-cookie'].find(value => value.startsWith('ec_session='));
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\/api/);
    const stored = await User.scope('withPassword').findByPk(alice.id);
    assert.match(stored.password, /^\$2[ab]\$12\$/);
  });
  await t.test('cadastro rejeita senha fraca e elevacao de privilegio', async () => {
    await alice.post('/api/users', { name: 'Teste', email: 'invalid', password: 'x' }).expect(400);
    await alice.post('/api/users', { name: 'Teste', email: 'valid@example.com', password, role: 'admin' }).expect(400);
    await alice.post('/api/users', { name: 'Teste', email: 'valid@example.com', password: 'a'.repeat(73) }).expect(400);
    await alice.post('/api/users', { name: 'Teste', email: alice.email, password }).expect(409);
  });
  await t.test('sem sessao nao acessa dados privados', async () => { await request(app).get('/api/expenses').expect(401); });
  await t.test('CSRF ausente, adulterado e origem externa sao rejeitados', async () => {
    await alice.agent.post('/api/categories').send({ name: 'Teste' }).expect(403);
    await alice.agent.post('/api/categories').set('X-CSRF-Token', '0'.repeat(64)).send({ name: 'Teste' }).expect(403);
    await alice.agent.post('/api/categories').set('Origin', 'https://attacker.example').set('X-CSRF-Token', alice.csrf).send({ name: 'Teste' }).expect(403);
    await alice.agent.post('/api/categories').set('Sec-Fetch-Site', 'cross-site').set('X-CSRF-Token', alice.csrf).send({ name: 'Teste' }).expect(403);
    const noCookie = await request(app).post('/api/auth/login').set('X-CSRF-Token', alice.csrf).send({ email: alice.email, password });
    assert.equal(noCookie.status, 403);
  });
  await t.test('mesmo nome de categoria e permitido para usuarios distintos', async () => {
    categoryA = (await alice.post('/api/categories', { name: 'Alimentacao', description: 'Teste' }).expect(201)).body.id;
    categoryB = (await bob.post('/api/categories', { name: 'Alimentacao' }).expect(201)).body.id;
    await alice.post('/api/categories', { name: 'Alimentacao' }).expect(409);
  });
  await t.test('categorias de outro usuario nao podem ser lidas, alteradas ou excluidas', async () => {
    await bob.agent.get(`/api/categories/${categoryA}`).expect(404);
    await bob.put(`/api/categories/${categoryA}`, { name: 'Invasao' }).expect(404);
    await bob.remove(`/api/categories/${categoryA}`).expect(404);
    const response = await bob.agent.get('/api/categories').expect(200);
    assert.equal(response.body.some(value => value.id === categoryA), false);
  });
  const values = () => ({ title: 'Despesa teste', amount: '0.10', categoryId: categoryA, date: '2026-01-10', description: 'Descricao antiga', status: 'PENDENTE' });
  await t.test('despesas invalidas sao rejeitadas sem revelar SQL', async () => {
    for (const invalid of [{ amount: 'abc' }, { amount: 0 }, { amount: '0.001' }, { amount: '10000000000' }, { date: '2026-02-30' }, { date: '2999-01-01' }, { title: '   ' }, { categoryId: 'invalid' }, { status: 'INVENTADO' }, { userId: bob.id }]) {
      const response = await alice.post('/api/expenses', { ...values(), ...invalid }).expect(400);
      assert.doesNotMatch(response.body.error, /SELECT|INSERT|Sequelize|stack/);
    }
  });
  await t.test('categoria de outro usuario nao pode ser vinculada', async () => { await bob.post('/api/expenses', { ...values(), categoryId: categoryA }).expect(400); });
  await t.test('criar despesa e limpar descricao preservam centavos e data', async () => {
    const response = await alice.post('/api/expenses', values()).expect(201);
    expenseId = response.body.expense.id;
    assert.equal(response.body.expense.date, '2026-01-10');
    assert.equal(response.body.expense.amount, '0.10');
    const updated = await alice.put(`/api/expenses/${expenseId}`, { description: '', status: 'PAGA' }).expect(200);
    assert.equal(updated.body.description, ''); assert.equal(updated.body.status, 'PAGA');
    await alice.put(`/api/expenses/${expenseId}`, { categoryId: categoryB }).expect(400);
  });
  await t.test('despesas de outro usuario nao podem ser lidas, alteradas ou excluidas', async () => {
    await bob.agent.get(`/api/expenses/${expenseId}`).expect(404);
    await bob.put(`/api/expenses/${expenseId}`, { amount: '999.99' }).expect(404);
    await bob.remove(`/api/expenses/${expenseId}`).expect(404);
    assert.deepEqual((await bob.agent.get('/api/expenses').expect(200)).body, []);
  });
  await t.test('agregacoes sao exatas e isoladas por usuario', async () => {
    await alice.post('/api/expenses', { ...values(), amount: '0.20' }).expect(201);
    const total = await alice.agent.get('/api/dashboard/total-expenses').expect(200);
    assert.equal(total.body.total, '0.30');
    assert.equal((await alice.agent.get('/api/dashboard/expenses-count')).body.quantidade, 2);
    const byCategory = (await alice.agent.get('/api/dashboard/expenses-by-category')).body;
    assert.equal(byCategory[0].categoryId, categoryA); assert.equal(byCategory[0].total, '0.30');
    assert.equal(Number((await bob.agent.get('/api/dashboard/total-expenses')).body.total), 0);
  });
  await t.test('filtros combinados, limites e erros de intervalo', async () => {
    const response = await alice.agent.get('/api/expenses').query({ status: 'PAGA', categoryId: categoryA, minAmount: '0', maxAmount: '0.10', startDate: '2026-01-10', endDate: '2026-01-10' }).expect(200);
    assert.equal(response.body.length, 1);
    await alice.agent.get('/api/expenses').query({ minAmount: '2', maxAmount: '1' }).expect(400);
    await alice.agent.get('/api/expenses').query({ startDate: '2026-02-01', endDate: '2026-01-01' }).expect(400);
    await alice.agent.get('/api/expenses').query({ minAmount: 'abc' }).expect(400);
    await alice.agent.get('/api/expenses').query({ categoryId: "' OR 1=1 --" }).expect(400);
  });
  await t.test('categoria em uso e protegida pela API e pelo banco', async () => {
    await alice.remove(`/api/categories/${categoryA}`).expect(400);
    await assert.rejects(Category.destroy({ where: { id: categoryA } }), error => error.name === 'SequelizeForeignKeyConstraintError');
  });
  await t.test('entradas SQL/HTML permanecem texto e nao alteram consultas', async () => {
    const title = "<img src=x onerror=alert(1)> ' OR 1=1 --";
    const created = await alice.post('/api/expenses', { ...values(), title }).expect(201);
    assert.equal(created.body.expense.title, title);
    await alice.remove(`/api/expenses/${created.body.expense.id}`).expect(200);
    await alice.post('/api/auth/login', { email: "' OR 1=1 --", password }).expect(400);
  });
  await t.test('JSON malformado e corpo excessivo tem respostas controladas', async () => {
    await alice.agent.post('/api/categories').set('Content-Type', 'application/json').set('X-CSRF-Token', alice.csrf).send('{bad').expect(400);
    await alice.post('/api/categories', { name: 'x'.repeat(20000) }).expect(413);
  });
  await t.test('JWT com chave antiga, assinatura alterada e expirado sao rejeitados', async () => {
    for (const token of [jwt.sign({ sub: alice.id }, 'dev-secret-change-me'), 'invalid.token.value', jwt.sign({}, config.jwt.secret, { subject: alice.id, jwtid: crypto.randomUUID(), issuer: config.jwt.issuer, audience: config.jwt.audience, expiresIn: -1 })]) {
      await request(app).get('/api/expenses').set('Cookie', `ec_session=${token}`).expect(401);
    }
  });
  await t.test('CSRF nao pode ser transplantado de outra sessao', async () => {
    const aliceCookie = alice.login.headers['set-cookie'].find(value => value.startsWith('ec_session=')).split(';')[0];
    const csrfResponse = await request(app).get('/api/auth/csrf');
    const csrfCookie = csrfResponse.headers['set-cookie'][0].split(';')[0];
    await request(app).post('/api/categories').set('Cookie', [aliceCookie, csrfCookie]).set('X-CSRF-Token', csrfResponse.body.csrfToken).send({ name: 'Transplante' }).expect(403);
  });
  await t.test('logout invalida token copiado no servidor', async () => {
    const copied = bob.login.headers['set-cookie'].find(value => value.startsWith('ec_session=')).split(';')[0];
    await bob.post('/api/auth/logout', {}).expect(204);
    await bob.agent.get('/api/expenses').expect(401);
    await request(app).get('/api/expenses').set('Cookie', copied).expect(401);
  });
  await t.test('CRUD conclui exclusao e categoria vazia pode ser removida', async () => {
    const expenses = (await alice.agent.get('/api/expenses')).body;
    for (const expense of expenses) await alice.remove(`/api/expenses/${expense.id}`).expect(200);
    await alice.put(`/api/categories/${categoryA}`, { name: 'Categoria editada', description: '' }).expect(200);
    await alice.remove(`/api/categories/${categoryA}`).expect(200);
    await alice.agent.get(`/api/categories/${categoryA}`).expect(404);
  });
  await t.test('tentativas repetidas de login recebem limite', async () => {
    let last;
    for (let index = 0; index < 6; index++) last = await alice.post('/api/auth/login', { email: alice.email, password: 'senha errada' });
    assert.equal(last.status, 429); assert.ok(last.headers['retry-after']);
  });
});
