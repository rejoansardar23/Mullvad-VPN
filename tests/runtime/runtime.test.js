import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import https from 'node:https';
import net from 'node:net';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { validateConfig, start } from '../../infrastructure/serve.mjs';
import { Store } from '../../services/control-api/store.ts';
import { createTlsFixture } from '../helpers/tls.js';

const run = promisify(execFile);

async function freePort() {
  const socket = net.createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const { port } = socket.address(); await new Promise(resolve => socket.close(resolve)); return port;
}
async function config(t) {
  const dir = await mkdtemp(join(tmpdir(), 'runtime-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const tls = await createTlsFixture(); t.after(tls.cleanup);
  await writeFile(join(dir, 'key.pem'), tls.key, { mode: 0o600 });
  await writeFile(join(dir, 'cert.pem'), tls.cert);
  const proxyPort = await freePort();
  let apiPort = await freePort(); while (apiPort === proxyPort) apiPort = await freePort();
  return { tls, dir, input: {
    database: join(dir, 'runtime.sqlite'), tls: { key: join(dir, 'key.pem'), cert: join(dir, 'cert.pem') },
    apiOrigin: 'https://control.example.invalid',
    management: { host: '127.0.0.1', port: apiPort }, proxy: { host: '127.0.0.1', port: proxyPort },
    extensionOrigins: [], gateway: { id: 'fixture', name: 'Local fixture', host: 'localhost', port: proxyPort,
      scheme: 'https', country: 'US', live: false, expectedIp: '203.0.113.10', verificationUrl: 'https://route.example.invalid/ip' },
  } };
}
function request(port, ca, path) {
  return new Promise((resolve, reject) => {
    https.get({ host: '127.0.0.1', port, ca, path, agent: false }, res => {
      let body = ''; res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    }).on('error', reject);
  });
}

test('runtime validation requires private management, external files, honest live preflight', async t => {
  const { input, dir } = await config(t);
  assert.equal(validateConfig(input).gateway.live, false);
  assert.throws(() => validateConfig({ ...input, management: { host: '0.0.0.0', port: 9443 } }), /loopback/);
  assert.throws(() => validateConfig({ ...input, database: fileURLToPath(new URL('../../runtime.sqlite', import.meta.url)) }), /outside checkout/);
  assert.throws(() => validateConfig({ ...input, database: fileURLToPath(new URL('../../..secret.sqlite', import.meta.url)) }), /outside checkout/);
  assert.throws(() => validateConfig({ ...input, gateway: { ...input.gateway, live: true } }), /preflight/);
  const preflight = { authorized: true, zeroAdditionalCostVerified: true, providerPermitsProxy: true, usRegionVerified: true };
  assert.throws(() => validateConfig({ ...input, preflight, gateway: { ...input.gateway, live: true } }), /public expected exit IP/);
  await symlink(input.tls.key, join(dir, 'linked.key'));
  assert.throws(() => validateConfig({ ...input, tls: { ...input.tls, key: join(dir, 'linked.key') } }), /symlinks/);
});

test('runtime config check verifies both TLS names and the key pair without opening SQLite', async t => {
  const { input, dir } = await config(t);
  const configPath = join(dir, 'config.json');
  const runtime = fileURLToPath(new URL('../../infrastructure/serve.mjs', import.meta.url));
  const check = async configuration => {
    await writeFile(configPath, JSON.stringify(configuration), { mode: 0o600 });
    return run(process.execPath, [runtime, '--check-config'], { env: { ...process.env, PROXY_CONFIG: configPath } });
  };
  const matched = { ...input, apiOrigin: 'https://127.0.0.1' };
  assert.match((await check(matched)).stdout, /Configuration and TLS identity checks passed/);
  await assert.rejects(check(input), { stderr: /control API hostname/ });
  await assert.rejects(check({ ...matched, gateway: { ...matched.gateway, host: 'other.example.invalid' } }),
    { stderr: /gateway hostname/ });
  const otherTls = await createTlsFixture();
  t.after(otherTls.cleanup);
  const otherKey = join(dir, 'other.key');
  await writeFile(otherKey, otherTls.key, { mode: 0o600 });
  await assert.rejects(check({ ...matched, tls: { ...matched.tls, key: otherKey } }), { stderr: /key values mismatch/i });
  await assert.rejects(stat(input.database), { code: 'ENOENT' });
});

test('configured runtime starts real TLS API, rejects unauthenticated admin, stops and restarts', async t => {
  const { input, tls } = await config(t);
  const validated = validateConfig(input);
  const seed = new Store(input.database); seed.createAccount('founder', 'test-only-long-password'); seed.close();
  let running = await start(validated);
  try {
    const health = await request(input.management.port, tls.ca, '/healthz');
    assert.equal(health.status, 200); assert.equal(health.body.releaseBlocked, true);
    assert.equal((await request(input.management.port, tls.ca, '/v1/status')).status, 401);
    await running.close();
    running = await start(validated);
    assert.equal((await request(input.management.port, tls.ca, '/healthz')).status, 200);
  } finally { await running.close(); }
});

test('runtime and storage reject a dangling database symlink without creating its target', async t => {
  const { input, dir } = await config(t);
  const target = join(dir, 'missing.sqlite');
  await symlink(target, input.database);

  assert.throws(() => validateConfig(input), /Runtime file symlinks are forbidden/);
  assert.throws(() => new Store(input.database), /Database symlinks are forbidden/);
  await assert.rejects(stat(target), { code: 'ENOENT' });
});
