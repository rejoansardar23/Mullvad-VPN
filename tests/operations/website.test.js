import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// This loopback HTTP fixture exercises actual browser interactions and fetches.
// It does not claim TLS or deployed control-plane validation; those have separate tests.
test('operations UI signs in, renders untrusted text safely, revokes and signs out', { timeout: 30000 }, async (t) => {
  const accountName = '<img src=x onerror="window.injected=true">';
  const session = 'test-session-used-only-by-loopback-ui-fixture';
  const expiresAt = Date.now() + 60000;
  let loggedIn = false;
  let revoked = false;
  let loginRequests = 0;
  const server = http.createServer(async (req, res) => {
    const json = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    const staticFiles = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
    if (staticFiles[req.url] && req.method === 'GET') {
      const [file, contentType] = staticFiles[req.url];
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'" });
      res.end(await readFile(new URL(`../../apps/operations/${file}`, import.meta.url)));
      return;
    }
    if (req.url === '/v1/login' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      loginRequests += 1;
      if (input.username !== accountName || input.password !== 'fixture-password') return json(401, { error: 'invalid_credentials' });
      loggedIn = true;
      return json(200, { token: session, expiresAt });
    }
    if (!loggedIn || req.headers.authorization !== `Bearer ${session}`) return json(401, { error: 'unauthorized' });
    if (req.url === '/v1/status' && req.method === 'GET') return json(200, {
      account: { username: accountName, quotaBytes: 1048576, usedBytes: 4096 },
      grants: [
        { id: 'fixture/grant', expiresAt, usedBytes: 4096, revoked, state: revoked ? 'revoked' : 'active', active: !revoked },
        { id: 'fixture-exhausted', expiresAt, usedBytes: 2048, revoked: false, state: 'exhausted', active: false },
        { id: 'fixture-expired', expiresAt: expiresAt - 120000, usedBytes: 0, revoked: false, state: 'expired', active: false },
        { id: 'fixture-revoked', expiresAt, usedBytes: 0, revoked: true, state: 'revoked', active: false },
        { id: 'fixture-unknown', expiresAt, usedBytes: 0, revoked: false, state: 'unknown', active: true },
        { id: 'fixture-inconsistent', expiresAt, usedBytes: 0, revoked: false, state: 'active', active: false },
      ],
      gateways: [{ id: 'fixture', name: '<script>window.injected=true</script>', scheme: 'https', host: 'localhost', port: 8443, live: false }],
      mode: 'local', releaseBlocked: true,
    });
    if (req.url === '/v1/grants/fixture%2Fgrant' && req.method === 'DELETE') {
      revoked = true;
      return json(200, { revoked: true });
    }
    if (req.url === '/v1/logout' && req.method === 'POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'JSON required' });
      let body = '';
      for await (const chunk of req) body += chunk;
      if (body !== '{}') return json(400, { error: 'JSON object required' });
      loggedIn = false;
      return json(200, { loggedOut: true });
    }
    json(404, { error: 'not_found' });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByLabel('Username', { exact: true }).fill(accountName);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('status').filter({ hasText: 'Sign-in failed' }).waitFor();
  assert.equal(await page.locator('#dashboard').isVisible(), false);
  assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '');

  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Service overview' }).waitFor();
  assert.equal(await page.locator('#account-name').textContent(), `Signed in as ${accountName}`);
  assert.equal(await page.locator('#usage').textContent(), '4.0 KiB');
  assert.equal(await page.locator('#active-grants').textContent(), '1');
  const grantRow = id => page.getByRole('row').filter({ has: page.getByRole('cell', { name: id, exact: true }) });
  for (const [id, label] of [
    ['fixture/grant', 'Authorized'], ['fixture-exhausted', 'Exhausted'], ['fixture-expired', 'Expired'],
    ['fixture-revoked', 'Revoked'], ['fixture-unknown', 'Unavailable'], ['fixture-inconsistent', 'Unavailable'],
  ]) {
    assert.equal(await grantRow(id).getByRole('cell', { name: label, exact: true }).count(), 1);
    assert.equal(await grantRow(id).getByRole('button', { name: /Revoke/ }).count(), Number(id === 'fixture/grant'));
  }
  assert.equal(await page.locator('#environment').textContent(), 'Local development');
  assert.match(await page.locator('#gateways').textContent(), /Development fixture · no live US exit verified/);
  assert.equal(await page.locator('#gateways strong').textContent(), '<script>window.injected=true</script>');
  assert.equal(await page.evaluate(() => Boolean(window.injected)), false);
  assert.equal(await page.locator('img').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);

  await page.getByRole('button', { name: 'Revoke grant fixture/grant' }).click();
  await page.getByRole('status').filter({ hasText: 'Grant revoked.' }).waitFor();
  assert.equal(revoked, true);
  assert.equal(await page.locator('#active-grants').textContent(), '0');
  assert.equal(await grantRow('fixture/grant').getByRole('cell', { name: 'Revoked', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Refresh' }).click();
  await page.getByRole('status').filter({ hasText: 'Overview updated.' }).waitFor();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('heading', { name: 'Sign in to operations' }).waitFor();
  assert.equal(loggedIn, false);
  assert.equal(await page.locator('#dashboard').isVisible(), false);
  assert.equal(await page.locator('#grants').textContent(), '');
  assert.equal(loginRequests, 2);
  assert.deepEqual(pageErrors, []);
});
