import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../../services/control-api/store.ts';
import { createControlApi } from '../../services/control-api/server.ts';
import { createTlsFixture } from '../helpers/tls.js';
const password = 'test-only-password-unique-123';

test('SQLite hashes secrets, session/grant expiry, durable quota, recovery revokes sessions', async () => {
  let now = Date.now();
  const dir = await mkdtemp(join(tmpdir(), 'vpn-store-')), path = join(dir, 'state.sqlite');
  let store = new Store(path, { now: () => now, sessionMs: 20000, grantMs: 10000 });
  try {
    assert.throws(() => store.createAccount('founder', 'short'));
    store.createAccount('founder', password, 10000);
    assert.equal(store.login('founder', 'incorrect'), null);
    const session = store.login('founder', password);
    const hash = store.session(session.token).hash;
    const grant = store.issue(hash, 'fixture');
    assert.ok(store.authorize(grant.username, grant.password));
    assert.equal(store.authorize(grant.username, 'wrong'), null);
    assert.ok(!(await readFile(path)).includes(Buffer.from(password)));
    assert.ok(!(await readFile(path)).includes(Buffer.from(grant.password)));
    assert.ok(!(await readFile(path)).includes(Buffer.from(session.token)));
    store.addUsage(grant.id, 10000);
    assert.equal(store.authorize(grant.username, grant.password), null);
    assert.throws(() => store.issue(hash, 'fixture'), /Quota/);
    store.close(); store = new Store(path, { now: () => now });
    assert.equal(store.status().account.usedBytes, 10000);
    now += 21000;
    assert.equal(store.session(session.token), null);
    store.recover('replacement-test-password-123');
    assert.equal(store.login('founder', password), null);
    assert.ok(store.login('founder', 'replacement-test-password-123'));
    assert.equal(store.authorize(grant.username, grant.password), null);
  } finally { store.close(); await rm(dir, { recursive: true, force: true }); }
});

test('founder recovery commits the password change and authorization revocation together', () => {
  const store = new Store(':memory:');
  const replacement = 'replacement-test-password-123';
  try {
    assert.throws(() => store.recover(replacement), /Founder account does not exist/);
    store.createAccount('founder', password);
    const session = store.login('founder', password);
    const grant = store.issue(store.session(session.token).hash, 'fixture');

    // Simulate a failed final write after the password and grant updates.
    store.db.exec("CREATE TRIGGER recovery_fault BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'fixture recovery fault'); END");
    assert.throws(() => store.recover(replacement), /fixture recovery fault/);
    assert.ok(store.session(session.token));
    assert.ok(store.authorize(grant.username, grant.password));
    assert.equal(store.login('founder', replacement), null);
    assert.ok(store.login('founder', password));

    store.db.exec('DROP TRIGGER recovery_fault');
    store.recover(replacement);
    assert.equal(store.session(session.token), null);
    assert.equal(store.authorize(grant.username, grant.password), null);
    assert.equal(store.login('founder', password), null);
    assert.ok(store.login('founder', replacement));
  } finally { store.close(); }
});

test('session logout returns revocations from a successful retry after a failed write', () => {
  const store = new Store(':memory:');
  try {
    store.createAccount('founder', password);
    const session = store.login('founder', password);
    const { hash } = store.session(session.token);
    const grant = store.issue(hash, 'fixture');

    store.db.exec("CREATE TRIGGER logout_fault BEFORE DELETE ON sessions BEGIN SELECT RAISE(ABORT, 'fixture logout fault'); END");
    assert.throws(() => store.revokeSession(hash), /fixture logout fault/);
    assert.ok(store.session(session.token));
    assert.ok(store.authorize(grant.username, grant.password));

    store.db.exec('DROP TRIGGER logout_fault');
    assert.deepEqual(store.revokeSession(hash), [grant.id]);
    assert.equal(store.session(session.token), null);
    assert.equal(store.authorize(grant.username, grant.password), null);
  } finally { store.close(); }
});

test('real TLS API: closed signup, auth, grant lifecycle, CORS, limits, admin status', async () => {
  const tls = await createTlsFixture(), store = new Store(':memory:'), revoked = [];
  store.createAccount('founder', password);
  const api = createControlApi({ tls, store, gateways: [{ id: 'fixture', live: false }], revoke: id => revoked.push(id) });
  const address = await api.listen();
  const request = (path, { method = 'GET', body, token, headers = {}, ca = tls.ca } = {}) => new Promise((resolve, reject) => {
    const req = https.request({ hostname: '127.0.0.1', port: address.port, path, method, ca,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers } }, res => {
      let data = ''; res.on('data', b => data += b); res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    }); req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
  });
  try {
    await assert.rejects(request('/healthz', { ca: [] }), /certificate/i);
    assert.equal((await request('/healthz')).status, 200);
    assert.equal((await request('/v1/signup', { method: 'POST', body: {} })).status, 401);
    assert.equal((await request('/v1/status')).status, 401);
    assert.equal((await request('/v1/login', { method: 'POST', body: { username: 'founder', password: 'wrong' } })).status, 401);
    const login = await request('/v1/login', { method: 'POST', body: { username: 'founder', password } });
    const token = login.data.token; assert.ok(token);
    assert.equal((await request('/v1/status', { token, headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await request('/v1/status', { token })).data.account.username, 'founder');
    assert.equal((await request('/v1/grants', { method: 'POST', token, body: { gatewayId: 'unknown' } })).status, 400);
    const grant = await request('/v1/grants', { method: 'POST', token, body: { gatewayId: 'fixture' } });
    assert.equal(grant.status, 201); assert.ok(store.authorize(grant.data.username, grant.data.password));
    const replacement = await request('/v1/grants', { method: 'POST', token, body: { gatewayId: 'fixture' } });
    assert.ok(revoked.includes(grant.data.id)); assert.equal(store.authorize(grant.data.username, grant.data.password), null);
    assert.equal((await request(`/v1/grants/${replacement.data.id}`, { method: 'DELETE', token })).status, 200);
    assert.ok(revoked.includes(replacement.data.id));
    assert.equal((await request('/v1/login', { method: 'POST', body: { a: 'x'.repeat(9000) } })).status, 413);
    assert.equal((await request('/v1/logout', { method: 'POST', body: {}, token })).status, 200);
    assert.equal((await request('/v1/status', { token })).status, 401);
    for (let i = 0; i < 3; i++) await request('/v1/login', { method: 'POST', body: { username: 'founder', password: 'bad' } });
    assert.equal((await request('/v1/login', { method: 'POST', body: { username: 'founder', password } })).status, 429);
  } finally { await api.close(); store.close(); await tls.cleanup(); }
});
