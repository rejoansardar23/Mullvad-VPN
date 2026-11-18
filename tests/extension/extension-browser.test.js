import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {canRunRealExtension} from '../helpers/chromium-extension.js';

test('Chromium loads the actual MV3 worker and renders an honest disconnected popup', {timeout: 30000}, async t => {
  if (!await canRunRealExtension(t)) return;
  execFileSync(process.execPath, ['apps/extension/build.js']);
  const extension = path.resolve('dist/extension');
  const profile = await mkdtemp(path.join(tmpdir(), 'private-route-chromium-'));
  let context;
  t.after(async () => {
    try { await context?.close(); }
    finally { await rm(profile, {recursive: true, force: true}); }
  });
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout: 10000});
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.locator('#message').filter({hasText: 'No browser proxy is active.'}).waitFor();
  assert.equal(await page.locator('#status').textContent(), 'Disconnected');
  assert.equal(await page.locator('#login').isVisible(), true);
  assert.equal(await page.locator('#controls').isVisible(), false);
  assert.match(await page.locator('aside').textContent(), /Other apps and incognito windows are not protected/);
  await page.locator('#origin').fill('http://localhost:8080');
  await page.locator('#username').fill('founder');
  await page.locator('#password').fill('not-sent-to-network');
  await page.getByRole('button', {name: 'Sign in securely'}).click();
  await page.locator('#error').filter({hasText: 'Enter an HTTPS control API origin'}).waitFor();
  assert.equal(await page.locator('#password').inputValue(), '');
  assert.deepEqual(errors, []);
  const state = await worker.evaluate(async () => {
    const setting = await chrome.proxy.settings.get({incognito: false});
    const session = await chrome.storage.session.get('session');
    return {level: setting.levelOfControl, auth: session.session.auth};
  });
  assert.equal(state.level, 'controllable_by_this_extension');
  assert.equal(state.auth, null);
});

test('Chromium renders the popup and handles UI actions with a simulated extension runtime', {timeout: 30000}, async () => {
  execFileSync(process.execPath, ['apps/extension/build.js']);
  const server = createServer(async (req, res) => {
    const files = {'/': ['popup.html', 'text/html'], '/popup.css': ['popup.css', 'text/css'], '/popup.js': ['popup.js', 'text/javascript']};
    const file = files[req.url];
    if (!file) {res.writeHead(404).end(); return;}
    res.setHeader('Content-Type', file[1]);
    res.end(await readFile(path.resolve('dist/extension', file[0])));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 400, height: 850}});
    await page.addInitScript(() => {
      window.chrome = {runtime: {async sendMessage(message) {
        if (message.type === 'status') return {ok: true, value: {status: 'disconnected', message: 'No browser proxy is active.', origin: '', signedIn: false, routingActive: false}};
        if (message.type === 'login') return {ok: false, error: 'Enter an HTTPS control API origin with no path or credentials.'};
        return {ok: false, error: 'Unsupported simulated command'};
      }}};
    });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#message').filter({hasText: 'No browser proxy is active.'}).waitFor();
    assert.equal(await page.locator('#status').textContent(), 'Disconnected');
    assert.equal(await page.locator('#login').isVisible(), true);
    assert.equal(await page.locator('#controls').isVisible(), false);
    await page.locator('#origin').fill('http://localhost:8080');
    await page.locator('#username').fill('founder');
    await page.locator('#password').fill('not-a-real-password');
    await page.getByRole('button', {name: 'Sign in securely'}).click();
    await page.locator('#error').filter({hasText: 'Enter an HTTPS control API origin'}).waitFor();
    assert.equal(await page.locator('#password').inputValue(), '');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
