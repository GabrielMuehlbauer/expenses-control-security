const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const run = crypto.randomBytes(5).toString('hex');
process.env.RECEIPT_DIRECTORY = path.resolve(__dirname, `../data/test-receipts-${run}`);
if (process.env.NODE_ENV !== 'test' || !/^[a-zA-Z0-9_]+_test$/.test(process.env.MYSQL_DATABASE || '')) throw new Error('Use o ambiente isolado de testes.');
const app = require('../src/app');
const { sequelize } = require('../src/models/database');
const { User } = require('../src/models/user');
const { Receipt } = require('../src/models/receipt');
const { Expense } = require('../src/models/expense');
const { Category } = require('../src/models/category');
const password = 'FamiliaSegura!12345';
const users = [];
let parent, other, child, sibling, category, entry, png, pdf;
async function login(email) {
  const agent = request.agent(app), token = (await agent.get('/api/auth/csrf')).body.csrfToken;
  const response = await agent.post('/api/auth/login').set('X-CSRF-Token', token).send({ email, password }).expect(200);
  return { agent, token, user: response.body.user,
    post: (url, body, account) => agent.post(url).set('X-CSRF-Token', token).set('X-Account-Id', account || '').send(body),
    put: (url, body, account) => agent.put(url).set('X-CSRF-Token', token).set('X-Account-Id', account || '').send(body),
    remove: (url, account) => agent.delete(url).set('X-CSRF-Token', token).set('X-Account-Id', account || ''),
    get: (url, account) => agent.get(url).set('X-Account-Id', account || ''),
    upload: (id, bytes, name, mime, account) => agent.post(`/api/entries/${id}/receipt`).set('X-CSRF-Token', token).set('X-Account-Id', account || '').attach('receipt', bytes, { filename: name, contentType: mime }) };
}
async function signup(suffix) {
  const email = `family-${run}-${suffix}@example.com`, agent = request.agent(app), token = (await agent.get('/api/auth/csrf')).body.csrfToken;
  const response = await agent.post('/api/users').set('X-CSRF-Token', token).send({ name: 'Responsavel teste', email, password }).expect(201);
  users.push(response.body.id); return login(email);
}
before(async () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../src/database/migrate.js')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  parent = await signup('parent'); other = await signup('other');
  const created = await parent.post('/api/children', { name: 'Filho teste', email: `family-${run}-child@example.com`, password }).expect(201);
  users.push(created.body.id); child = await login(created.body.email);
  const second = await parent.post('/api/children', { name: 'Irmao teste', email: `family-${run}-sibling@example.com`, password }).expect(201);
  users.push(second.body.id); sibling = second.body;
  category = (await parent.post('/api/categories', { name: 'Filho categoria' }, child.user.id).expect(201)).body.id;
  entry = (await parent.post('/api/entries', { title: 'Gasto do filho', amount: '10.25', categoryId: category, date: '2026-01-10', status: 'PAGA' }, child.user.id).expect(201)).body.expense.id;
  png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#abcdef' } }).png().toBuffer();
  const document = await PDFDocument.create(); document.addPage([100, 100]); pdf = Buffer.from(await document.save());
});
after(async () => {
  await Receipt.destroy({ where: { userId: users } });
  await Expense.destroy({ where: { userId: users } });
  await Category.destroy({ where: { userId: users } });
  // Filhos antes dos responsaveis, respeitando a restricao da chave estrangeira.
  await User.destroy({ where: { parentId: users } });
  await User.destroy({ where: { id: users } });
  await sequelize.close();
  // Remove apenas arquivos criados dentro do diretorio privado deste teste.
  for (const name of await fs.readdir(process.env.RECEIPT_DIRECTORY).catch(() => [])) await fs.unlink(path.join(process.env.RECEIPT_DIRECTORY, name));
  await fs.rmdir(process.env.RECEIPT_DIRECTORY).catch(() => {});
});
test('controle parental, receitas e comprovantes privados', async t => {
  await t.test('filho inicia com VIEW e nao cria contas nem altera permissoes', async () => {
    assert.deepEqual(child.user.permissions, ['VIEW']); assert.equal(child.user.parentId, parent.user.id);
    assert.equal((await child.get('/api/entries')).body.length, 1);
    await child.post('/api/entries', {}).expect(403);
    await child.post('/api/categories', { name: 'Tentativa' }).expect(403);
    await child.put(`/api/entries/${entry}`, { amount: '1.00' }).expect(403);
    await child.remove(`/api/entries/${entry}`).expect(403);
    await child.post('/api/children', {}).expect(403);
    await child.put(`/api/children/${child.user.id}/permissions`, { permissions: ['VIEW', 'EDIT'] }).expect(403);
  });
  await t.test('responsavel acessa somente filhos diretos e filhos nao acessam pais/irmaos', async () => {
    await other.get('/api/entries', child.user.id).expect(403);
    await child.get('/api/entries', parent.user.id).expect(403);
    await child.get('/api/entries', sibling.id).expect(403);
    await other.put(`/api/children/${child.user.id}/permissions`, { permissions: ['VIEW'] }).expect(404);
    assert.equal((await parent.get('/api/entries', child.user.id)).body[0].id, entry);
    assert.equal((await parent.get('/api/entries')).body.length, 0);
  });
  await t.test('permissoes validadas e alteracao efetiva na sessao existente', async () => {
    await parent.put(`/api/children/${child.user.id}/permissions`, { permissions: ['EDIT'] }).expect(400);
    await parent.put(`/api/children/${child.user.id}/permissions`, { permissions: ['VIEW', 'ADMIN'] }).expect(400);
    await parent.put(`/api/children/${child.user.id}/permissions`, { permissions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ATTACH'], parentId: other.user.id }).expect(400);
    await parent.put(`/api/children/${child.user.id}/permissions`, { permissions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ATTACH'] }).expect(200);
    await child.put(`/api/entries/${entry}`, { description: 'Edicao autorizada' }).expect(200);
    await parent.put(`/api/children/${child.user.id}/permissions`, { permissions: ['VIEW'] }).expect(200);
    await child.put(`/api/entries/${entry}`, { description: 'Nao autorizada' }).expect(403);
  });
  await t.test('saldo exato inclui somente receitas e despesas liquidadas da conta selecionada', async () => {
    const values = { title: 'Receita', amount: '20.35', type: 'INCOME', categoryId: category, date: '2026-01-10', status: 'PAGA' };
    await parent.post('/api/entries', values, child.user.id).expect(201);
    await parent.post('/api/entries', { ...values, amount: '999.99', status: 'PENDENTE' }, child.user.id).expect(201);
    await parent.post('/api/entries', { ...values, type: 'EXPENSE', amount: '888.88', status: 'PENDENTE' }, child.user.id).expect(201);
    const totals = (await child.get('/api/dashboard/summary')).body;
    assert.deepEqual(totals, { received: '20.35', paid: '10.25', balance: '10.10' });
    assert.equal((await parent.get('/api/dashboard/summary')).body.balance, '0.00');
    assert.equal((await child.agent.get('/api/entries').query({ type: 'INCOME', status: 'PAGA' })).body.length, 1);
    await child.agent.get('/api/entries').query({ type: 'SQL' }).expect(400);
    await parent.put(`/api/entries/${entry}`, { amount: '30.45' }, child.user.id).expect(200);
    assert.equal((await child.get('/api/dashboard/summary')).body.balance, '-10.10');
  });
  await t.test('upload sem permissao, sem CSRF e por conta alheia e bloqueado', async () => {
    await child.upload(entry, png, 'cupom.png', 'image/png').expect(403);
    await parent.agent.post(`/api/entries/${entry}/receipt`).set('X-Account-Id', child.user.id).attach('receipt', png, 'cupom.png').expect(403);
    await other.upload(entry, png, 'cupom.png', 'image/png').expect(404);
  });
  await t.test('imagem valida e regravada, fica privada e pode ser baixada por autorizados', async () => {
    const response = await parent.upload(entry, png, 'cupom.png', 'image/png', child.user.id).expect(201);
    assert.equal(response.body.receipt.storageName, undefined);
    assert.equal(response.body.receipt.mimeType, 'image/png');
    const metadata = await child.get(`/api/entries/${entry}/receipt`).expect(200);
    assert.equal(metadata.body.receipt.originalName, 'cupom.png');
    const download = await child.get(`/api/entries/${entry}/receipt/download`).expect(200);
    assert.match(download.headers['content-disposition'], /^attachment/);
    assert.match(download.headers['content-security-policy'], /sandbox/);
    assert.ok(Buffer.isBuffer(download.body));
    await request(app).get(`/api/entries/${entry}/receipt/download`).expect(401);
    await other.get(`/api/entries/${entry}/receipt/download`).expect(404);
    const record = await Receipt.findOne({ where: { entryId: entry } });
    const publicAttempt = await request(app).get(`/data/receipts/${record.storageName}`);
    assert.notEqual(publicAttempt.headers['content-type'], 'image/png');
  });
  await t.test('PDF valido substitui comprovante e remove arquivo anterior', async () => {
    const previous = (await Receipt.findOne({ where: { entryId: entry } })).storageName;
    await parent.upload(entry, pdf, 'cupom.pdf', 'application/pdf', child.user.id).expect(201);
    await assert.rejects(fs.access(path.join(process.env.RECEIPT_DIRECTORY, previous)));
    assert.equal((await child.get(`/api/entries/${entry}/receipt`)).body.receipt.mimeType, 'application/pdf');
  });
  await t.test('arquivos falsos, ativos, malformados e maiores que 5 MB sao rejeitados', async () => {
    await parent.upload(entry, Buffer.from('<script>alert(1)</script>'), 'fake.png', 'image/png', child.user.id).expect(400);
    await parent.upload(entry, png, 'fake.pdf', 'application/pdf', child.user.id).expect(400);
    await parent.upload(entry, Buffer.from('%PDF-1.7\ninvalid\n%%EOF'), 'fake.pdf', 'application/pdf', child.user.id).expect(400);
    const active = await PDFDocument.create(); active.addPage(); active.addJavaScript('test', 'app.alert(1)');
    await parent.upload(entry, Buffer.from(await active.save()), 'active.pdf', 'application/pdf', child.user.id).expect(400);
    await parent.upload(entry, Buffer.alloc(5 * 1024 * 1024 + 1), 'huge.png', 'image/png', child.user.id).expect(413);
  });
  await t.test('JPEG valido pode ser anexado e mantem formato de imagem', async () => {
    const jpeg = await sharp(png).jpeg().toBuffer();
    const response = await parent.upload(entry, jpeg, 'foto.jpg', 'image/jpeg', child.user.id).expect(201);
    assert.equal(response.body.receipt.mimeType, 'image/jpeg');
  });
  await t.test('quota da conta impede crescimento ilimitado do armazenamento', async () => {
    const receipt = await Receipt.findOne({ where: { entryId: entry } });
    const actualSize = receipt.size;
    await receipt.update({ size: 100 * 1024 * 1024 });
    const extra = (await parent.post('/api/entries', { title: 'Teste quota', amount: '1.00', categoryId: category, date: '2026-01-10' }, child.user.id)).body.expense.id;
    await parent.upload(extra, png, 'quota.png', 'image/png', child.user.id).expect(413);
    await receipt.update({ size: actualSize });
    await parent.remove(`/api/entries/${extra}`, child.user.id).expect(200);
  });
  await t.test('anexar nao autoriza substituir ou remover sem EDIT/DELETE', async () => {
    await parent.put(`/api/children/${child.user.id}/permissions`, { permissions: ['VIEW', 'ATTACH'] }).expect(200);
    await child.upload(entry, png, 'new.png', 'image/png').expect(403);
    await child.remove(`/api/entries/${entry}/receipt`).expect(403);
    await parent.remove(`/api/entries/${entry}/receipt`, child.user.id).expect(204);
    await child.upload(entry, png, 'new.png', 'image/png').expect(201);
  });
  await t.test('excluir lancamento remove comprovante privado', async () => {
    const stored = (await Receipt.findOne({ where: { entryId: entry } })).storageName;
    await parent.remove(`/api/entries/${entry}`, child.user.id).expect(200);
    assert.equal(await Receipt.count({ where: { entryId: entry } }), 0);
    await assert.rejects(fs.access(path.join(process.env.RECEIPT_DIRECTORY, stored)));
  });
  await t.test('upload concorrente com exclusao nao deixa arquivo orfao', async () => {
    const baseline = new Set(await fs.readdir(process.env.RECEIPT_DIRECTORY));
    const created = (await parent.post('/api/entries', { title: 'Concorrencia', amount: '1.00', categoryId: category, date: '2026-01-10' }, child.user.id)).body.expense.id;
    const [upload, remove] = await Promise.all([parent.upload(created, png, 'race.png', 'image/png', child.user.id), parent.remove(`/api/entries/${created}`, child.user.id)]);
    assert.ok([201, 404].includes(upload.status)); assert.equal(remove.status, 200);
    assert.equal(await Receipt.count({ where: { entryId: created } }), 0);
    const remaining = await fs.readdir(process.env.RECEIPT_DIRECTORY);
    assert.deepEqual(remaining.filter(name => !baseline.has(name)), []);
  });
  await t.test('revogar VIEW bloqueia todos os dados financeiros sem invalidar o login', async () => {
    await parent.put(`/api/children/${child.user.id}/permissions`, { permissions: [] }).expect(200);
    await child.get('/api/dashboard/summary').expect(403);
    await child.get('/api/categories').expect(403);
    const response = await child.get('/api/auth/session').expect(200);
    assert.deepEqual(response.body.user.permissions, []);
  });
});
