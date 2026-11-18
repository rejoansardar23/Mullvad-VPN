const STATES = new Set(['disconnected', 'connecting', 'connected', 'fixture', 'error']);
const ROUTE_PRIVACY_POLICY = 'disable_non_proxied_udp';

export interface Gateway {
  id: string; name: string; country: string; host: string; port: number; scheme: 'https';
  verificationUrl: string; expectedIp: string; live: boolean;
}
export interface ActiveGrant {id: string; username: string; password: string; expiresAt: number; gateway: Gateway}
interface AccountSession {origin: string; token: string; expiresAt: number}
interface RouteState {status: 'disconnected' | 'connecting' | 'connected' | 'fixture' | 'error'; message: string}
type WebRTCPolicy = 'default' | 'default_public_and_private_interfaces' | 'default_public_interface_only' | 'disable_non_proxied_udp';
interface RoutingMetadata {rules: chrome.proxy.ProxyConfig; gatewayName: string; origin: string; previousPrivacy: WebRTCPolicy; privacyOwnedBefore: boolean}
interface StoredSession {auth: AccountSession | null; active: ActiveGrant | null; state: RouteState}

export function apiOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Enter an HTTPS control API origin with no path or credentials.');
  }
  return url.origin;
}

export function validateGateway(raw: Gateway, origin: string): Gateway {
  if (!raw || typeof raw.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id) ||
      typeof raw.name !== 'string' || raw.name.length > 100 || typeof raw.host !== 'string' ||
      !/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?|\[[a-fA-F0-9:]+\])$/.test(raw.host) ||
      raw.scheme !== 'https' || !Number.isInteger(raw.port) || raw.port < 1 || raw.port > 65535 ||
      typeof raw.live !== 'boolean' || (raw.live && raw.country !== 'US') ||
      typeof raw.expectedIp !== 'string' || !/^[a-fA-F0-9.:]{2,45}$/.test(raw.expectedIp)) {
    throw new Error('The API returned an invalid or unsupported gateway.');
  }
  const check = new URL(raw.verificationUrl);
  if (check.protocol !== 'https:' || check.username || check.password || check.hash || check.origin === origin) {
    throw new Error('Route verification requires a separate HTTPS origin through the proxy.');
  }
  // A gateway cannot bypass verification via the control-plane exception.
  const control = new URL(origin);
  if (check.hostname === control.hostname && (check.port || '443') === (control.port || '443')) {
    throw new Error('Route verification cannot use the control-plane bypass.');
  }
  return {id: raw.id, name: raw.name, host: raw.host.toLowerCase(), port: raw.port,
    scheme: 'https', country: raw.country, verificationUrl: check.href,
    expectedIp: raw.expectedIp, live: raw.live};
}

export function proxyRules(gateway: Gateway, origin: string): chrome.proxy.ProxyConfig {
  const control = new URL(origin);
  return {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {scheme: 'https', host: gateway.host, port: gateway.port},
      // Remove Chrome's implicit loopback bypass; keep only the owner control API reachable.
      bypassList: ['<-loopback>', `https://${control.hostname}:${control.port || '443'}`],
    },
  };
}

export function sameRules(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)])) : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

export function authentication(details: chrome.webRequest.OnAuthRequiredDetails, active: ActiveGrant | null | undefined, now = Date.now()): chrome.webRequest.BlockingResponse {
  if (!active || active.expiresAt <= now || details.isProxy !== true ||
      details.challenger?.host?.toLowerCase() !== active.gateway.host ||
      details.challenger?.port !== active.gateway.port || details.scheme?.toLowerCase() !== 'basic') return {};
  return {authCredentials: {username: active.username, password: active.password}};
}

export class RouteController {
  browser: typeof chrome;
  request: typeof fetch;
  now: () => number;
  state: RouteState;
  auth: AccountSession | null;
  active: ActiveGrant | null;
  metadata: RoutingMetadata | null;
  constructor(browser: typeof chrome, request: typeof fetch = globalThis.fetch.bind(globalThis), now: () => number = Date.now) {
    this.browser = browser; this.request = request; this.now = now;
    this.state = {status: 'disconnected', message: 'No browser proxy is active.'};
    this.auth = null; this.active = null; this.metadata = null;
  }

  async save() {
    await this.browser.storage.session.set({session: {auth: this.auth, active: this.active, state: this.state}});
    if (this.metadata) await this.browser.storage.local.set({routing: this.metadata});
    else await this.browser.storage.local.remove('routing');
  }

  async init() {
    await this.browser.storage.session.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'});
    const [sessionData, localData] = await Promise.all([
      this.browser.storage.session.get('session'), this.browser.storage.local.get(['routing', 'origin']),
    ]);
    const {session} = sessionData as {session?: StoredSession};
    const {routing, origin} = localData as {routing?: RoutingMetadata; origin?: string};
    this.metadata = routing || null;
    if (session) { this.auth = session.auth; this.active = session.active; this.state = session.state; }
    if (this.metadata) {
      if (!this.active || this.active.expiresAt <= this.now()) {
        this.active = null;
        this.state = {status: 'error', message: 'Credentials unavailable or expired. Proxy settings remain in place; disconnect explicitly to restore browsing.'};
      } else {
        await this.verify();
      }
    } else if (!STATES.has(this.state.status)) this.state = {status: 'disconnected', message: 'No browser proxy is active.'};
    await this.save();
    return this.snapshot(origin);
  }

  snapshot(origin?: string) {
    return {...this.state, origin: origin || this.auth?.origin || '', signedIn: Boolean(this.auth && this.auth.expiresAt > this.now()),
      gateway: this.active?.gateway?.name || this.metadata?.gatewayName || null,
      expiresAt: this.active?.expiresAt || null, routingActive: Boolean(this.metadata)};
  }

  async api(path: string, options: RequestInit = {}): Promise<unknown> {
    if (!this.auth || this.auth.expiresAt <= this.now()) throw new Error('Sign in again; your session expired.');
    const response = await this.request(`${this.auth.origin}${path}`, {
      ...options, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${this.auth.token}`, ...options.headers},
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again; authorization expired.' : `Control API request failed (${response.status}).`);
    if (response.status === 204) return null;
    return response.json();
  }

  async login({origin, username, password}: {origin: string; username: string; password: string}) {
    origin = apiOrigin(origin);
    if (this.metadata && origin !== this.auth?.origin && origin !== this.metadata.origin) {
      throw new Error('Disconnect before changing the control API.');
    }
    const response = await this.request(`${origin}/v1/login`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, password}),
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Sign-in failed. Check your credentials and API certificate.');
    const auth = await response.json() as AccountSession;
    if (typeof auth.token !== 'string' || auth.token.length < 16 || auth.token.length > 4096 ||
        !Number.isFinite(auth.expiresAt) || auth.expiresAt <= this.now()) throw new Error('Invalid sign-in response.');
    this.auth = {origin, token: auth.token, expiresAt: auth.expiresAt};
    await this.browser.storage.local.set({origin});
    await this.save();
    return this.snapshot();
  }

  async gateways() {
    if (!this.auth) throw new Error('Sign in before choosing a gateway.');
    const origin = this.auth.origin;
    const body = await this.api('/v1/gateways') as {gateways: Gateway[]};
    if (!Array.isArray(body.gateways) || body.gateways.length > 10) throw new Error('Invalid gateway list.');
    return body.gateways.map(g => validateGateway(g, origin));
  }

  async connect(gatewayId: string) {
    if (!this.auth) throw new Error('Sign in before connecting.');
    const origin = this.auth.origin;
    if (this.metadata) throw new Error('Disconnect the current route before reconnecting.');
    const settings = await this.browser.proxy.settings.get({incognito: false});
    if (settings.levelOfControl !== 'controllable_by_this_extension') {
      throw new Error('Browser policy or another extension controls proxy settings.');
    }
    const gateway = (await this.gateways()).find(g => g.id === gatewayId);
    if (!gateway) throw new Error('Select an available gateway.');
    const privacy = await this.browser.privacy.network.webRTCIPHandlingPolicy.get({});
    if (!['controllable_by_this_extension', 'controlled_by_this_extension'].includes(privacy.levelOfControl)) {
      throw new Error('WebRTC privacy settings are controlled elsewhere.');
    }
    const grant = await this.api('/v1/grants', {method: 'POST', body: JSON.stringify({gatewayId})}) as ActiveGrant;
    const approved = validateGateway(grant.gateway, origin);
    if (!sameRules(approved, gateway) || typeof grant.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(grant.id) ||
        typeof grant.username !== 'string' || typeof grant.password !== 'string' ||
        !Number.isFinite(grant.expiresAt) || grant.expiresAt <= this.now() || grant.expiresAt > this.now() + 3600000) {
      throw new Error('Invalid connection grant.');
    }
    this.active = {id: grant.id, username: grant.username, password: grant.password, expiresAt: grant.expiresAt, gateway};
    this.metadata = {rules: proxyRules(gateway, origin), gatewayName: gateway.name,
      origin, previousPrivacy: privacy.value, privacyOwnedBefore: privacy.levelOfControl === 'controlled_by_this_extension'};
    this.state = {status: 'connecting', message: 'Applying encrypted proxy and checking the route…'};
    await this.save();
    try {
      await this.browser.privacy.network.webRTCIPHandlingPolicy.set({value: ROUTE_PRIVACY_POLICY, scope: 'regular'});
      await this.browser.proxy.settings.set({value: this.metadata.rules, scope: 'regular'});
      await this.browser.alarms.create('grant-expiry', {when: grant.expiresAt});
      await this.browser.alarms.create('route-check', {periodInMinutes: 1});
      return await this.verify();
    } catch (error) {
      this.state = {status: 'error', message: `${error instanceof Error ? error.message : 'Proxy setup failed.'} Disconnect explicitly to restore browsing.`};
      await this.save();
      throw error;
    }
  }

  private async requireRoutePrivacy() {
    const policy = await this.browser.privacy.network.webRTCIPHandlingPolicy.get({});
    if (policy.levelOfControl !== 'controlled_by_this_extension' || policy.value !== ROUTE_PRIVACY_POLICY) {
      throw new Error('The extension no longer controls the required WebRTC privacy setting.');
    }
  }

  async verify() {
    if (!this.active || this.active.expiresAt <= this.now()) return this.expire();
    this.state = {status: 'connecting', message: 'Checking the gateway route…'};
    await this.save();
    try {
      const setting = await this.browser.proxy.settings.get({incognito: false});
      if (setting.levelOfControl !== 'controlled_by_this_extension' || !sameRules(setting.value, this.metadata?.rules)) {
        throw new Error('Browser proxy control changed. This route is not protected.');
      }
      await this.requireRoutePrivacy();
      const response = await this.request(this.active.gateway.verificationUrl, {
        cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Route verification service did not respond.');
      const data = await response.json();
      if (this.active.expiresAt <= this.now()) return this.expire();
      const current = await this.browser.proxy.settings.get({incognito: false});
      if (current.levelOfControl !== 'controlled_by_this_extension' || !sameRules(current.value, this.metadata?.rules)) {
        throw new Error('Browser proxy control changed during verification. This route is not protected.');
      }
      await this.requireRoutePrivacy();
      if (this.active.expiresAt <= this.now()) return this.expire();
      if (data.ip !== this.active.gateway.expectedIp) throw new Error('Exit IP differs from the configured gateway.');
      this.state = this.active.gateway.live
        ? {status: 'connected', message: `Verified browser route · ${data.ip}`}
        : {status: 'fixture', message: 'Local fixture verified. This is not a live US connection.'};
    } catch (error) {
      this.state = {status: 'error', message: `${error instanceof Error ? error.message : 'Route check failed.'} Proxy settings stay in place; disconnect explicitly to restore browsing.`};
    }
    await this.save();
    return this.snapshot();
  }

  async expire() {
    this.active = null;
    this.state = {status: 'error', message: 'Proxy grant expired. Proxy settings remain in place; disconnect explicitly to restore browsing.'};
    await this.save();
    return this.snapshot();
  }

  async disconnect() {
    const active = this.active;
    if (this.metadata) {
      const setting = await this.browser.proxy.settings.get({incognito: false});
      if (setting.levelOfControl === 'controlled_by_this_extension' && sameRules(setting.value, this.metadata.rules)) {
        await this.browser.proxy.settings.clear({scope: 'regular'});
      } else if (setting.levelOfControl === 'controlled_by_this_extension') {
        throw new Error('Proxy settings changed unexpectedly. Inspect Chrome proxy settings before clearing them.');
      }
      const privacy = await this.browser.privacy.network.webRTCIPHandlingPolicy.get({});
      if (privacy.levelOfControl === 'controlled_by_this_extension' && privacy.value === ROUTE_PRIVACY_POLICY) {
        if (this.metadata.privacyOwnedBefore) await this.browser.privacy.network.webRTCIPHandlingPolicy.set({value: this.metadata.previousPrivacy, scope: 'regular'});
        else await this.browser.privacy.network.webRTCIPHandlingPolicy.clear({scope: 'regular'});
      }
    }
    this.active = null; this.metadata = null;
    await this.browser.alarms.clear('grant-expiry'); await this.browser.alarms.clear('route-check');
    this.state = {status: 'disconnected', message: 'Browser proxy removed. Your usual browser routing is restored.'};
    await this.save();
    if (active && this.auth) {
      try { await this.api(`/v1/grants/${encodeURIComponent(active.id)}`, {method: 'DELETE'}); }
      catch { this.state.message += ' Server revocation could not be confirmed; the grant still expires automatically.'; await this.save(); }
    }
    return this.snapshot();
  }

  async logout() {
    await this.disconnect();
    try { if (this.auth) await this.api('/v1/logout', {method: 'POST', body: JSON.stringify({})}); }
    finally { this.auth = null; await this.save(); }
    return this.snapshot();
  }
}
