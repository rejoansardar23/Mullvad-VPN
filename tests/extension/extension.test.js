import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {apiOrigin, validateGateway, proxyRules, authentication, RouteController} from '../../apps/extension/core.ts';

const origin = 'https://control.example.test';
const gateway = {id: 'fixture', name: 'Controlled fixture', country: 'XX', scheme: 'https', host: 'proxy.example.test', port: 8443,
  verificationUrl: 'https://check.example.test/ip', expectedIp: '203.0.113.10', live: false};
const NOW = 2000000000000;
const active = {id: 'grant-one', username: 'unique-user', password: 'ephemeral-test-value', expiresAt: NOW + 100000, gateway};

function storage() {
  const values = {};
  return {
    values, async get(keys) {
      if (typeof keys === 'string') return {[keys]: values[keys]};
      return Object.fromEntries(keys.map(k => [k, values[k]]));
    }, async set(data) { Object.assign(values, structuredClone(data)); },
    async remove(key) { delete values[key]; }, async setAccessLevel(value) { this.access = value; },
  };
}
function fixture({live = false, verifierIp = gateway.expectedIp, verifyFail = false, grantExpired = false} = {}) {
  const local = storage(); const session = storage(); const calls = [];
  let currentProxy = {value: {mode: 'system'}, levelOfControl: 'controllable_by_this_extension'};
  let currentPrivacy = {value: 'default', levelOfControl: 'controllable_by_this_extension'};
  const browser = {storage: {local, session}, alarms: {async create(...args) { calls.push(['alarm', ...args]); }, async clear() {}},
    proxy: {settings: {async get() { return structuredClone(currentProxy); }, async set({value}) {
      calls.push(['setProxy', value]); currentProxy = {value, levelOfControl: 'controlled_by_this_extension'};
    }, async clear() { calls.push(['clearProxy']); currentProxy = {value: {mode: 'system'}, levelOfControl: 'controllable_by_this_extension'}; }}},
    privacy: {network: {webRTCIPHandlingPolicy: {async get() { return structuredClone(currentPrivacy); }, async set({value}) {
      calls.push(['setPrivacy', value]); currentPrivacy = {value, levelOfControl: 'controlled_by_this_extension'};
    }, async clear() { calls.push(['clearPrivacy']); currentPrivacy = {value: 'default', levelOfControl: 'controllable_by_this_extension'}; }}}},
  };
  const selected = {...gateway, ...(live ? {live: true, country: 'US'} : {})};
  const request = async (url, options = {}) => {
    calls.push(['request', url, options]);
    let body;
    if (url === `${origin}/v1/login`) body = {token: 'session-token-at-least-16-chars', expiresAt: NOW + 1000000};
    else if (url === `${origin}/v1/gateways`) body = {gateways: [selected]};
    else if (url === `${origin}/v1/grants`) body = {...active, gateway: selected, expiresAt: grantExpired ? NOW - 1 : active.expiresAt};
    else if (url === gateway.verificationUrl) { if (verifyFail) throw new Error('Gateway offline'); body = {ip: verifierIp}; }
    else if (url.endsWith('/v1/logout') || options.method === 'DELETE') return {ok: true, status: 204};
    else throw new Error(`Unexpected request ${url}`);
    return {ok: true, status: 200, async json() { return body; }};
  };
  const controller = new RouteController(browser, request, () => NOW);
  return {controller, browser, request, calls, setProxy(value) { currentProxy = value; }, setPrivacy(value) { currentPrivacy = value; }};
}
async function signedIn(f) { await f.controller.init(); await f.controller.login({origin, username: 'founder', password: 'only-in-request'}); }

test('only uncredentialed HTTPS API origins are accepted', () => {
  assert.equal(apiOrigin(origin), origin);
  for (const url of ['http://localhost:8080', 'https://user:secret@host.test', `${origin}/path`, `${origin}/?secret=1`, `${origin}/#fragment`]) {
    assert.throws(() => apiOrigin(url));
  }
});

test('gateway validation rejects remote scripts, direct routing and control-plane verification', () => {
  assert.equal(validateGateway(gateway, origin).scheme, 'https');
  for (const change of [{scheme: 'http'}, {host: 'evil.test/path'}, {port: 0}, {port: 65536}, {live: true},
    {verificationUrl: `${origin}/ip`}, {verificationUrl: 'http://check.example.test/ip'}, {verificationUrl: 'https://secret:password@check.example.test/ip'}]) {
    assert.throws(() => validateGateway({...gateway, ...change}, origin));
  }
});

test('proxy configuration has a single encrypted proxy and narrowly scoped control exception', () => {
  const rules = proxyRules(gateway, origin);
  assert.deepEqual(rules.rules.singleProxy, {scheme: 'https', host: gateway.host, port: 8443});
  assert.deepEqual(rules.rules.bypassList, ['<-loopback>', 'https://control.example.test:443']);
  assert.equal(JSON.stringify(rules).includes('direct'), false);
});

test('proxy credentials match only exact Basic proxy challenge host and port', () => {
  const details = {isProxy: true, challenger: {host: gateway.host, port: 8443}, scheme: 'basic'};
  assert.deepEqual(authentication(details, active, NOW), {authCredentials: {username: active.username, password: active.password}});
  for (const bad of [{...details, isProxy: false}, {...details, challenger: {host: 'other.example.test', port: 8443}},
    {...details, challenger: {host: `${gateway.host}.evil.test`, port: 8443}}, {...details, challenger: {host: gateway.host, port: 443}},
    {...details, scheme: 'digest'}]) assert.deepEqual(authentication(bad, active, NOW), {});
  assert.deepEqual(authentication(details, {...active, expiresAt: NOW}, NOW), {});
  assert.deepEqual(authentication(details, null, NOW), {});
});

test('fixture connection applies routing and privacy before verification, without a live success claim', async () => {
  const f = fixture(); await signedIn(f);
  const state = await f.controller.connect('fixture');
  assert.equal(state.status, 'fixture'); assert.match(state.message, /not a live US/);
  const proxyIndex = f.calls.findIndex(c => c[0] === 'setProxy');
  const verifyIndex = f.calls.findIndex(c => c[0] === 'request' && c[1] === gateway.verificationUrl);
  assert.ok(proxyIndex >= 0 && verifyIndex > proxyIndex);
  assert.equal(f.browser.storage.session.access.accessLevel, 'TRUSTED_CONTEXTS');
  assert.equal(JSON.stringify(f.browser.storage.local.values).includes(active.password), false);
  assert.equal(f.browser.storage.session.values.session.active.password, active.password);
  assert.equal(Object.hasOwn(state, 'password'), false);
});

test('live connection requires a matching exit IP', async () => {
  const f = fixture({live: true}); await signedIn(f);
  assert.equal((await f.controller.connect('fixture')).status, 'connected');
  const wrong = fixture({live: true, verifierIp: '198.51.100.4'}); await signedIn(wrong);
  assert.equal((await wrong.controller.connect('fixture')).status, 'error');
  assert.equal(wrong.controller.snapshot().routingActive, true);
  assert.equal(wrong.calls.filter(c => c[0] === 'clearProxy').length, 0);
});

test('gateway outage retains proxy configuration and exposes an error', async () => {
  const f = fixture({verifyFail: true}); await signedIn(f);
  const state = await f.controller.connect('fixture');
  assert.equal(state.status, 'error'); assert.match(state.message, /Gateway offline/);
  assert.equal(state.routingActive, true);
  assert.equal(f.calls.filter(c => c[0] === 'clearProxy').length, 0);
});

test('conflicting proxy or WebRTC control prevents grants and proxy changes', async () => {
  for (const kind of ['proxy', 'privacy']) {
    const f = fixture(); await signedIn(f);
    if (kind === 'proxy') f.setProxy({levelOfControl: 'controlled_by_other_extensions', value: {mode: 'system'}});
    else f.setPrivacy({levelOfControl: 'not_controllable', value: 'default'});
    await assert.rejects(f.controller.connect('fixture'), /control/);
    assert.equal(f.calls.some(c => c[0] === 'setProxy'), false);
    assert.equal(f.calls.some(c => c[0] === 'request' && c[1] === `${origin}/v1/grants`), false);
  }
});

test('expired grants cannot apply proxy settings', async () => {
  const f = fixture({grantExpired: true}); await signedIn(f);
  await assert.rejects(f.controller.connect('fixture'), /Invalid connection grant/);
  assert.equal(f.calls.some(c => c[0] === 'setProxy'), false);
});

test('disconnect clears only exact owned settings, restores privacy and revokes grant', async () => {
  const f = fixture(); await signedIn(f); await f.controller.connect('fixture');
  const result = await f.controller.disconnect();
  assert.equal(result.status, 'disconnected'); assert.equal(result.routingActive, false);
  assert.equal(f.calls.filter(c => c[0] === 'clearProxy').length, 1);
  assert.equal(f.calls.filter(c => c[0] === 'clearPrivacy').length, 1);
  assert.ok(f.calls.some(c => c[0] === 'request' && c[1].endsWith(`/v1/grants/${active.id}`) && c[2].method === 'DELETE'));
  assert.equal(f.browser.storage.session.values.session.active, null);
  assert.equal(f.browser.storage.local.values.routing, undefined);
});

test('disconnect does not change proxy settings another extension owns', async () => {
  const f = fixture(); await signedIn(f); await f.controller.connect('fixture');
  f.setProxy({value: {mode: 'pac_script'}, levelOfControl: 'controlled_by_other_extensions'});
  await f.controller.disconnect();
  assert.equal(f.calls.filter(c => c[0] === 'clearProxy').length, 0);
});

test('unexpected own settings are not blindly erased', async () => {
  const f = fixture(); await signedIn(f); await f.controller.connect('fixture');
  f.setProxy({value: {mode: 'direct'}, levelOfControl: 'controlled_by_this_extension'});
  await assert.rejects(f.controller.disconnect(), /changed unexpectedly/);
  assert.equal(f.calls.filter(c => c[0] === 'clearProxy').length, 0);
});

test('expiry forgets proxy password while keeping routing blocked until explicit disconnect', async () => {
  const f = fixture(); await signedIn(f); await f.controller.connect('fixture');
  const state = await f.controller.expire();
  assert.equal(state.status, 'error'); assert.equal(state.routingActive, true);
  assert.equal(f.browser.storage.session.values.session.active, null);
  assert.equal(f.calls.filter(c => c[0] === 'clearProxy').length, 0);
});

test('service-worker restart restores credentials and rechecks the actual route', async () => {
  const f = fixture(); await signedIn(f); await f.controller.connect('fixture');
  const restarted = new RouteController(f.browser, f.request, () => NOW);
  const before = f.calls.filter(c => c[0] === 'request' && c[1] === gateway.verificationUrl).length;
  const state = await restarted.init();
  assert.equal(state.status, 'fixture');
  assert.equal(restarted.active.password, active.password);
  assert.equal(f.calls.filter(c => c[0] === 'request' && c[1] === gateway.verificationUrl).length, before + 1);
});

test('browser restart without ephemeral credentials never reports connected or clears routing', async () => {
  const f = fixture(); await signedIn(f); await f.controller.connect('fixture');
  await f.browser.storage.session.remove('session');
  const restarted = new RouteController(f.browser, f.request, () => NOW);
  const state = await restarted.init();
  assert.equal(state.status, 'error'); assert.equal(state.signedIn, false); assert.equal(state.routingActive, true);
  assert.equal(f.calls.filter(c => c[0] === 'clearProxy').length, 0);
  await restarted.disconnect();
  assert.equal(f.calls.filter(c => c[0] === 'clearProxy').length, 1);
});

test('session and route verifier requests forbid credential cookies, caching and redirects', async () => {
  const f = fixture(); await signedIn(f); await f.controller.connect('fixture');
  for (const [, , options] of f.calls.filter(c => c[0] === 'request')) {
    assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
  }
});

test('a grant that expires during route verification never becomes connected', async () => {
  const f = fixture({live: true}); await signedIn(f);
  const original = f.controller.request;
  f.controller.request = async (url, options) => {
    const result = await original(url, options);
    if (url === gateway.verificationUrl) f.controller.now = () => active.expiresAt + 1;
    return result;
  };
  const state = await f.controller.connect('fixture');
  assert.equal(state.status, 'error'); assert.match(state.message, /expired/);
  assert.equal(f.controller.active, null);
});

test('settings changed while verification is pending prevent a connected claim', async () => {
  const f = fixture({live: true}); await signedIn(f);
  const original = f.controller.request;
  f.controller.request = async (url, options) => {
    const result = await original(url, options);
    if (url === gateway.verificationUrl) f.setProxy({levelOfControl: 'controlled_by_other_extensions', value: {mode: 'direct'}});
    return result;
  };
  const state = await f.controller.connect('fixture');
  assert.equal(state.status, 'error'); assert.match(state.message, /control changed during verification/);
});

test('route verification stops reporting a connection after WebRTC policy changes', async () => {
  const f = fixture({live: true});
  await signedIn(f);
  assert.equal((await f.controller.connect('fixture')).status, 'connected');
  const original = f.controller.request;
  f.controller.request = async (url, options) => {
    const result = await original(url, options);
    if (url === gateway.verificationUrl) {
      f.setPrivacy({levelOfControl: 'controlled_by_other_extensions', value: 'default'});
    }
    return result;
  };

  const state = await f.controller.verify();
  assert.equal(state.status, 'error');
  assert.match(state.message, /WebRTC privacy setting/);
  assert.equal(state.routingActive, true);
  assert.equal(f.calls.filter(c => c[0] === 'clearProxy').length, 0);

  const requests = f.calls.filter(c => c[0] === 'request').length;
  assert.equal((await f.controller.verify()).status, 'error');
  assert.equal(f.calls.filter(c => c[0] === 'request').length, requests);
  await f.controller.disconnect();
  assert.equal(f.calls.filter(c => c[0] === 'clearPrivacy').length, 0);
});

test('logout sends a valid JSON POST before clearing the account session', async () => {
  const f = fixture(); await signedIn(f);
  await f.controller.logout();
  const request = f.calls.find(c => c[0] === 'request' && c[1] === `${origin}/v1/logout`);
  assert.equal(request[2].method, 'POST'); assert.deepEqual(JSON.parse(request[2].body), {});
  assert.equal(f.controller.auth, null);
});

test('worker bounds repeated proxy challenges without cancelling website authentication', async () => {
  const f = fixture();
  function event() { return {listener: null, addListener(listener) { this.listener = listener; }}; }
  const authRequired = event(); const completed = event(); const errorOccurred = event();
  f.browser.webRequest = {onAuthRequired: authRequired, onCompleted: completed, onErrorOccurred: errorOccurred};
  f.browser.runtime = {id: 'test-id', getURL: name => `chrome-extension://test-id/${name}`, onMessage: event()};
  f.browser.proxy.onProxyError = event(); f.browser.alarms.onAlarm = event();
  const activeNow = {...active, expiresAt: Date.now() + 100000};
  await f.browser.storage.session.set({session: {auth: null, active: activeNow, state: {status: 'disconnected', message: ''}}});
  const previous = globalThis.chrome; globalThis.chrome = f.browser;
  try {
    const coreUrl = new URL('../../apps/extension/core.ts', import.meta.url).href;
    const source = (await readFile(new URL('../../apps/extension/worker.ts', import.meta.url), 'utf8')).replace("'./core.js'", JSON.stringify(coreUrl));
    await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, {mode: 'strip'})).toString('base64')}`);
    const details = {requestId: 'one-request', isProxy: true, challenger: {host: gateway.host, port: gateway.port}, scheme: 'basic'};
    const challenge = detail => new Promise(resolve => authRequired.listener(detail, resolve));
    assert.deepEqual(await challenge(details), {authCredentials: {username: active.username, password: active.password}});
    assert.deepEqual(await challenge({...details, isProxy: false}), {});
    assert.deepEqual(await challenge(details), {cancel: true});
    completed.listener({requestId: details.requestId});
    assert.deepEqual(await challenge(details), {authCredentials: {username: active.username, password: active.password}});
  } finally { if (previous === undefined) delete globalThis.chrome; else globalThis.chrome = previous; }
});


test('default RouteController fetch retains the browser global receiver', async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = function(url) {
    assert.equal(this, globalThis, 'Browser fetch requires its global receiver');
    requests.push(url);
    return Promise.resolve({ok: true, status: 200,
      json: async () => ({token: 'regression-session-token-12345', expiresAt: Date.now() + 60000})});
  };
  try {
    const f = fixture();
    const controller = new RouteController(f.browser);
    await controller.init();
    const result = await controller.login({origin, username: 'founder', password: 'local-test-only'});
    assert.equal(result.signedIn, true);
    assert.deepEqual(requests, [origin + '/v1/login']);
  } finally {
    globalThis.fetch = original;
  }
});
