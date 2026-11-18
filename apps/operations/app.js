const byId = (id) => document.getElementById(id);
let token = null;
let expiryTimer = null;
let busy = false;
const grantLabels = new Map([
  ['active', 'Authorized'],
  ['exhausted', 'Exhausted'],
  ['expired', 'Expired'],
  ['revoked', 'Revoked'],
]);

function feedback(message, error = false) {
  byId('feedback').textContent = message;
  byId('feedback').dataset.error = String(error);
}

function signedOut(message = '') {
  token = null;
  clearTimeout(expiryTimer);
  byId('password').value = '';
  byId('dashboard').hidden = true;
  byId('login-panel').hidden = false;
  for (const id of ['grants', 'gateways']) byId(id).replaceChildren();
  feedback(message);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    method, headers, cache: 'no-store', credentials: 'omit', redirect: 'error',
    signal: AbortSignal.timeout(15000),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    if (response.status === 401 && token) signedOut('Your session expired. Sign in again.');
    if (response.status === 401) throw new Error('Sign-in failed or session expired.');
    if (response.status === 429) throw new Error('Too many requests. Wait before trying again.');
    throw new Error(`The service could not complete this request (${response.status}).`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function bytes(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return 'Unavailable';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const unit = count ? Math.min(4, Math.floor(Math.log(count) / Math.log(1024))) : 0;
  return `${(count / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function timestamp(value) {
  const numeric = typeof value === 'number' ? value : Number.NaN;
  return new Date(Number.isFinite(numeric) && numeric < 1e12 ? numeric * 1000 : value).getTime();
}

function cell(row, text) {
  const td = document.createElement('td');
  td.textContent = String(text);
  row.append(td);
  return td;
}

function renderStatus(status) {
  if (!status || !status.account || !Array.isArray(status.grants) || !Array.isArray(status.gateways)) {
    throw new Error('The service returned an invalid overview.');
  }
  const grants = status.grants.map(grant => ({
    grant,
    state: grant.active === (grant.state === 'active') ? grant.state : undefined,
  }));
  byId('account-name').textContent = `Signed in as ${status.account.username}`;
  byId('usage').textContent = bytes(status.account.usedBytes);
  byId('quota').textContent = `Account quota: ${bytes(status.account.quotaBytes)}`;
  byId('active-grants').textContent = String(grants.filter(({ state }) => state === 'active').length);
  byId('environment').textContent = status.mode === 'local' ? 'Local development' : 'Configured';
  const gateways = byId('gateways');
  gateways.replaceChildren();
  if (!status.gateways.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No gateway is configured. An authorized host is required before live use.';
    gateways.append(empty);
  }
  for (const gateway of status.gateways) {
    const item = document.createElement('article');
    item.className = 'gateway';
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = gateway.name || gateway.id;
    const endpoint = document.createElement('p');
    endpoint.textContent = `${gateway.scheme || 'https'}://${gateway.host}:${gateway.port}`;
    const state = document.createElement('span');
    state.className = 'gateway-status';
    state.textContent = gateway.live ? 'Live configuration · route not tested by this view' : 'Development fixture · no live US exit verified';
    details.append(name, endpoint);
    item.append(details, state);
    gateways.append(item);
  }
  byId('grants').replaceChildren();
  byId('no-grants').hidden = grants.length !== 0;
  for (const { grant, state } of grants) {
    const row = document.createElement('tr');
    const expires = timestamp(grant.expiresAt);
    cell(row, grant.id);
    cell(row, Number.isFinite(expires) ? new Date(expires).toLocaleString() : 'Unavailable');
    cell(row, bytes(grant.usedBytes));
    cell(row, grantLabels.get(state) ?? 'Unavailable');
    const action = cell(row, '');
    if (state === 'active') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Revoke';
      button.setAttribute('aria-label', `Revoke grant ${grant.id}`);
      button.addEventListener('click', () => run(async () => {
        await request(`/v1/grants/${encodeURIComponent(grant.id)}`, { method: 'DELETE' });
        await refresh();
        feedback('Grant revoked.');
      }));
      action.append(button);
    } else action.textContent = '—';
    byId('grants').append(row);
  }
}

async function refresh() {
  const result = await request('/v1/status');
  if (token) renderStatus(result);
}

async function run(action) {
  if (busy) return;
  busy = true;
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  feedback('Contacting the private service…');
  try { await action(); }
  catch (error) {
    const message = error.name === 'TimeoutError' ? 'The service did not respond in time.' : error.message;
    feedback(message || 'The request failed. Try again.', true);
  } finally {
    busy = false;
    for (const button of document.querySelectorAll('button')) button.disabled = false;
  }
}

byId('login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(async () => {
    const username = byId('username').value;
    const password = byId('password').value;
    byId('password').value = '';
    const result = await request('/v1/login', { method: 'POST', body: { username, password } });
    if (typeof result?.token !== 'string' || !result.token) throw new Error('The service returned an invalid session.');
    token = result.token;
    const expires = timestamp(result.expiresAt);
    if (!Number.isFinite(expires) || expires <= Date.now()) {
      signedOut();
      throw new Error('The service returned an expired session.');
    }
    expiryTimer = setTimeout(() => signedOut('Your session expired. Sign in again.'), Math.min(expires - Date.now(), 2147483647));
    try { await refresh(); }
    catch (error) { signedOut(); throw error; }
    if (token) {
      byId('login-panel').hidden = true;
      byId('dashboard').hidden = false;
      feedback('Overview updated. This view does not test the browser route.');
    }
  });
});

byId('refresh').addEventListener('click', () => run(async () => {
  await refresh();
  if (token) feedback('Overview updated.');
}));
byId('logout').addEventListener('click', () => run(async () => {
  try { await request('/v1/logout', { method: 'POST', body: {} }); }
  finally { signedOut('Signed out of this view.'); }
}));

window.addEventListener('pagehide', () => { token = null; clearTimeout(expiryTimer); });
