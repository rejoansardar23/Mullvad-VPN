import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { Store } from '../../services/control-api/store.ts';
import { createControlApi } from '../../services/control-api/server.ts';
import { createTlsFixture } from '../helpers/tls.js';

test('founder operations revokes extension grants, denies invalid bearers and reports exhausted quota', async () => {
  const tls = await createTlsFixture();
  const store = new Store(':memory:');
  const password = 'independent-security-fixture-password';
  store.createAccount('founder', password);
  const revoked = [];
  const api = createControlApi({ tls, store, gateways: [{ id: 'fixture', live: false }], revoke: id => revoked.push(id) });
  const address = await api.listen();
  function request(path, { method = 'GET', token, body } = {}) {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const req = https.request({ host: '127.0.0.1', port: address.port, ca: tls.ca, path, method, agent: false,
        headers: { ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) }));
      });
      req.on('error', reject);
      req.end(payload);
    });
  }
  try {
    const extension = await request('/v1/login', { method: 'POST', body: { username: 'founder', password } });
    const operations = await request('/v1/login', { method: 'POST', body: { username: 'founder', password } });
    const grant = await request('/v1/grants', { method: 'POST', token: extension.data.token, body: { gatewayId: 'fixture' } });
    assert.equal(grant.status, 201);
    assert.ok(store.authorize(grant.data.username, grant.data.password));
    const denied = await request(`/v1/grants/${grant.data.id}`, { method: 'DELETE', token: 'invalid-bearer' });
    assert.equal(denied.status, 401);
    assert.ok(store.authorize(grant.data.username, grant.data.password));
    const result = await request(`/v1/grants/${grant.data.id}`, { method: 'DELETE', token: operations.data.token });
    assert.equal(result.status, 200, 'The founder dashboard must be able to revoke a grant created by the founder extension');
    assert.equal(result.data.revoked, true);
    assert.equal(store.authorize(grant.data.username, grant.data.password), null);
    assert.deepEqual(revoked, [grant.data.id]);

    const quotaGrant = await request('/v1/grants', { method: 'POST', token: extension.data.token, body: { gatewayId: 'fixture' } });
    assert.equal(quotaGrant.status, 201);
    store.addUsage(quotaGrant.data.id, store.status().account.quotaBytes);
    const status = await request('/v1/status', { token: operations.data.token });
    assert.equal(status.status, 200);
    const exhaustedGrant = status.data.grants.find(({ id }) => id === quotaGrant.data.id);
    assert.equal(exhaustedGrant.state, 'exhausted');
    assert.equal(exhaustedGrant.active, false);
    assert.equal(store.authorize(quotaGrant.data.username, quotaGrant.data.password), null);
  } finally {
    await api.close();
    store.close();
    await tls.cleanup();
  }
});
