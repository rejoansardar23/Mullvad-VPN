import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import tls from 'node:tls';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { initDevelopment, startDevelopment } from '../../scripts/development/dev.mjs';

const run = promisify(execFile);

async function setup(t) {
  const stateDir = await mkdtemp(join(tmpdir(), 'private-route-dev-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const paths = await initDevelopment({ stateDir, founderPassword: 'local-test-founder-password' });
  const credentials = JSON.parse(await readFile(paths.credentials, 'utf8'));
  const ca = await readFile(paths.cert);
  await writeFile(paths.config, JSON.stringify({ apiPort: 0, gatewayPort: 0, fixturePort: 0, extensionOrigins: [] }));
  return { stateDir, paths, credentials, ca };
}
function request(port, ca, path, { method = 'GET', body, token } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({ host: '127.0.0.1', port, ca, path, method, agent: false,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, (res) => {
      const chunks = []; res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
  });
}

function connectProxy(running, ca, grant) {
  const fixture = `localhost:${running.fixtureAddress.port}`;
  const authorization = Buffer.from(`${grant.username}:${grant.password}`).toString('base64');
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: '127.0.0.1', port: running.gatewayAddress.port, ca, method: 'CONNECT', path: fixture, agent: false,
      headers: { Host: fixture, 'Proxy-Authorization': `Basic ${authorization}` },
    });
    req.on('error', reject);
    req.on('connect', (response, socket, head) => {
      if (head.length) socket.unshift(head);
      resolve({ status: response.statusCode, socket });
    });
    req.end();
  });
}

test('development initialization is repeatable and never rotates existing account credentials', async (t) => {
  const f = await setup(t);
  const before = await readFile(f.paths.credentials, 'utf8');
  const certBefore = await readFile(f.paths.cert, 'utf8');
  await initDevelopment({ stateDir: f.stateDir, founderPassword: 'different-local-test-password' });
  assert.equal(await readFile(f.paths.credentials, 'utf8'), before);
  assert.equal(await readFile(f.paths.cert, 'utf8'), certBefore);
  for (const path of Object.values(f.paths).filter((p) => p !== f.stateDir)) assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.equal((await stat(f.stateDir)).mode & 0o777, 0o700);
});

test('default local services require trusted TLS and advertise no live gateway', async (t) => {
  const f = await setup(t);
  const running = await startDevelopment({ stateDir: f.stateDir });
  try {
    const port = running.apiAddress.port;
    assert.equal(running.apiAddress.address, '127.0.0.1');
    assert.equal(running.gatewayAddress.address, '127.0.0.1');
    assert.equal((await request(port, f.ca, '/healthz')).body.status, 'ok');
    await assert.rejects(request(port, undefined, '/healthz'), /certificate|self.signed/);
    const login = await request(port, f.ca, '/v1/login', { method: 'POST', body: f.credentials });
    assert.equal(login.status, 200);
    const gateways = await request(port, f.ca, '/v1/gateways', { token: login.body.token });
    assert.deepEqual(gateways.body.gateways, []);
    assert.equal((await request(port, f.ca, '/v1/status')).status, 401);
  } finally { await running.close(); }
  // Restarting from retained state must not need undocumented initialization.
  const restarted = await startDevelopment({ stateDir: f.stateDir });
  try { assert.equal((await request(restarted.apiAddress.port, f.ca, '/healthz')).status, 200); }
  finally { await restarted.close(); }
});

for (const blockedListener of ['gatewayPort', 'apiPort']) {
  test(`development startup preserves the bind error and recovers after occupied ${blockedListener}`, async (t) => {
    const f = await setup(t);
    const blocker = net.createServer();
    blocker.listen(0, '127.0.0.1');
    await once(blocker, 'listening');
    t.after(() => new Promise(resolve => blocker.close(() => resolve())));
    await writeFile(f.paths.config, JSON.stringify({
      apiPort: 0, gatewayPort: 0, fixturePort: 0, extensionOrigins: [],
      [blockedListener]: blocker.address().port,
    }));

    await assert.rejects(startDevelopment({ stateDir: f.stateDir }), { code: 'EADDRINUSE' });
    assert.equal(blocker.listening, true, 'Startup failure must not stop the unrelated listener');
    await new Promise(resolve => blocker.close(resolve));

    const recovered = await startDevelopment({ stateDir: f.stateDir });
    try {
      assert.equal((await request(recovered.apiAddress.port, f.ca, '/healthz')).body.status, 'ok');
    } finally { await recovered.close(); }
  });
}

test('explicit fixture uses an issued grant and real TLS CONNECT without claiming a US exit', async (t) => {
  const f = await setup(t);
  const running = await startDevelopment({ stateDir: f.stateDir, fixture: true });
  let socket, inner;
  try {
    const login = await request(running.apiAddress.port, f.ca, '/v1/login', { method: 'POST', body: f.credentials });
    const grants = await request(running.apiAddress.port, f.ca, '/v1/grants', { method: 'POST', body: { gatewayId: 'fixture' }, token: login.body.token });
    assert.equal(grants.status, 201);
    assert.equal(grants.body.gateway.live, false);
    assert.equal(grants.body.gateway.country, 'LOCAL');
    const tunnel = await connectProxy(running, f.ca, grants.body);
    socket = tunnel.socket;
    assert.equal(tunnel.status, 200);
    inner = tls.connect({ socket, servername: 'localhost', ca: f.ca });
    inner.on('error', () => {});
    await once(inner, 'secureConnect');
    assert.equal(inner.authorized, true);
    inner.write(`GET /ip HTTP/1.1\r\nHost: localhost:${running.fixtureAddress.port}\r\nConnection: close\r\n\r\n`);
    let response = '';
    inner.on('data', (chunk) => { response += chunk; });
    await once(inner, 'end');
    assert.match(response, /"ip":"127\.0\.0\.1","fixture":true/);
    const status = await request(running.apiAddress.port, f.ca, '/v1/status', { token: login.body.token });
    assert.ok(status.body.account.usedBytes > 0);
    const revoke = await request(running.apiAddress.port, f.ca, `/v1/grants/${grants.body.id}`, { method: 'DELETE', token: login.body.token });
    assert.equal(revoke.body.revoked, true);
  } finally { inner?.destroy(); socket?.destroy(); await running.close(); }
});


test('simulated off-host backup handoff restores usage and requires fresh API and proxy credentials', async (t) => {
  // These independent directories simulate hosts on the same local machine.
  const primary = await setup(t);
  const recovery = await setup(t);
  await rm(recovery.paths.database);
  await rm(recovery.paths.credentials);
  const live = await startDevelopment({ stateDir: primary.stateDir, fixture: true });
  let oldToken, oldGrant, usedBytes;
  try {
    const port = live.apiAddress.port;
    const login = await request(port, primary.ca, '/v1/login', { method: 'POST', body: primary.credentials });
    assert.equal(login.status, 200);
    oldToken = login.body.token;
    const grant = await request(port, primary.ca, '/v1/grants', { method: 'POST', body: { gatewayId: 'fixture' }, token: oldToken });
    assert.equal(grant.status, 201);
    oldGrant = grant.body;
    const tunnel = await connectProxy(live, primary.ca, oldGrant);
    tunnel.socket.destroy();
    assert.equal(tunnel.status, 200);
    const status = await request(port, primary.ca, '/v1/status', { token: oldToken });
    usedBytes = status.body.account.usedBytes;
    assert.ok(usedBytes > 0);
  } finally { await live.close(); }

  const backup = fileURLToPath(new URL('../../scripts/recovery/backup.mjs', import.meta.url));
  const account = fileURLToPath(new URL('../../services/control-api/cli.ts', import.meta.url));
  const backupEnv = { BACKUP_PASSWORD: 'fixture-only-database-backup-passphrase' };
  const previousDatabase = await readFile(primary.paths.database);
  const archive = join(primary.stateDir, 'recovery.enc');
  const transferred = join(recovery.stateDir, 'recovery.enc');
  await run(process.execPath, [backup, 'backup', primary.paths.database, archive], { cwd: primary.stateDir, env: backupEnv });
  await copyFile(archive, transferred);
  await run(process.execPath, [backup, 'restore', transferred, recovery.paths.database], { cwd: recovery.stateDir, env: backupEnv });

  const recoveredPassword = 'fixture-only-new-founder-password';
  await run(process.execPath, [account, 'recover', recovery.paths.database], {
    cwd: recovery.stateDir, env: { FOUNDER_PASSWORD: recoveredPassword },
  });

  const running = await startDevelopment({ stateDir: recovery.stateDir, fixture: true });
  try {
    const port = running.apiAddress.port;
    assert.equal((await request(port, recovery.ca, '/v1/status', { token: oldToken })).status, 401);
    assert.equal((await request(port, recovery.ca, '/v1/login', { method: 'POST', body: primary.credentials })).status, 401);
    const staleTunnel = await connectProxy(running, recovery.ca, oldGrant);
    staleTunnel.socket.destroy();
    assert.equal(staleTunnel.status, 407);

    const login = await request(port, recovery.ca, '/v1/login', { method: 'POST', body: { username: 'founder', password: recoveredPassword } });
    assert.equal(login.status, 200);
    const token = login.body.token;
    const status = await request(port, recovery.ca, '/v1/status', { token });
    assert.equal(status.body.account.username, 'founder');
    assert.equal(status.body.account.usedBytes, usedBytes);
    assert.equal(status.body.grants.length, 1);
    assert.equal(status.body.grants[0].id, oldGrant.id);
    assert.equal(status.body.grants[0].state, 'revoked');

    const grant = await request(port, recovery.ca, '/v1/grants', { method: 'POST', body: { gatewayId: 'fixture' }, token });
    assert.equal(grant.status, 201);
    const tunnel = await connectProxy(running, recovery.ca, grant.body);
    tunnel.socket.destroy();
    assert.equal(tunnel.status, 200);
  } finally { await running.close(); }
  assert.ok((await readFile(primary.paths.database)).equals(previousDatabase), 'The original database remains available for rollback');
});
