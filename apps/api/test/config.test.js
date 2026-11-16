const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const configFile = require.resolve('../src/config/auth');
test('configuracao insegura falha e cookies de producao exigem HTTPS', () => {
  for (const secret of ['', 'dev-secret-change-me', 'a'.repeat(64)]) {
    const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(configFile)})`], { env: { ...process.env, JWT_SECRET: secret }, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
  }
  const result = spawnSync(process.execPath, ['-e', `const config=require(${JSON.stringify(configFile)}); console.log(JSON.stringify(config.cookieOptions));`], { env: { ...process.env, NODE_ENV: 'production', WEB_ORIGINS: 'https://expenses.example', JWT_SECRET: crypto.randomBytes(48).toString('base64url') }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const options = JSON.parse(result.stdout);
  assert.equal(options.secure, true); assert.equal(options.httpOnly, true); assert.equal(options.sameSite, 'lax');
});
