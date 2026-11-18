# Local development and private installation

This is a browser-proxy prototype. A local fixture is not a US exit. Node 24.22.1, npm, OpenSSL and zip are required; Chromium is needed for the UI tests. No AI API, cloud provider account or paid service is needed for these checks.

## Reproduce

```sh
npm ci --ignore-scripts
npm run check
npm run package
npm run dev:init
npm run dev
```

The installer preserves lockfile integrity and TLS verification. No dependency lifecycle scripts run. `npm run check` performs strict TypeScript checking, security/runtime tests, real Chromium UI checks and the MV3 build. The actual MV3-load test reports **skipped** when the installed browser's managed extension policy blocks it; do not remove that policy. Set `CHROMIUM_PATH` only to an authorized installed browser when using a different system.

`npm run dev:init` creates ignored `.local/` with private permissions: a local test TLS identity, development SQLite database, config and one random **test-only** founder credential. Existing credentials are preserved on repeat runs. Read the credential file only in your private environment; never paste its values into chat, logs or Git. You may supply `FOUNDER_PASSWORD` through a secure process environment before initial setup. Do not reuse a real account password.

The default development runner advertises **no gateway**. `npm run dev -- --fixture` starts a local verifier and advertises only `Local fixture (not US)`. The fixture verifier returns a controlled loopback IP; production destination policy still denies internal networks. The fixture exception is injected only by this explicit development mode. Stop with Ctrl+C; shutdown closes the services and database. Startup/stop/restart are tested.

All listeners bind to loopback. API, proxy and optional verifier ports default to 9443, 9444 and 9445; private `.local/config.json` can change them. Use a client that explicitly trusts `.local/localhost.pem` for local checks. Browser testing requires importing this **development-only** CA into an isolated test browser trust store; do not disable TLS checks or install the private key. Do not add the development CA to a production gateway or your general-purpose trust store. The test suite creates and deletes separate temporary certificates.

## Install your private extension

1. Run `npm run package`. The unpacked build is in `dist/extension`; the versioned ZIP and SHA-256 file are in `dist/`.
2. In an owner-controlled Chrome that permits unpacked extensions, open `chrome://extensions`, enable Developer Mode and load `dist/extension`. This is not a Web Store publication.
3. Copy the extension's displayed ID into `.local/config.json` as an exact `chrome-extension://<id>` entry in `extensionOrigins`; restart the development services. Production config has the same explicit allowlist. The ID is not a secret.
4. Use your trusted HTTPS API origin and private founder credentials in the popup. Default development has no gateway. Explicit fixture mode may verify a local route but must remain labelled a fixture.
5. For a real connection, first complete [DEPLOYMENT.md](DEPLOYMENT.md), including authorized US hosting, trusted TLS and exit verification. Never turn a fixture into a live gateway by merely changing a country label.

The installed cloud Chromium has `ExtensionInstallBlocklist: ["*"]`. The ordinary test run skips actual MV3 loading and browser proxy routing here. Use the [strict acceptance command](../apps/extension/README.md) on an authorized unpacked-extension runner. Popup DOM tests use an explicitly simulated extension runtime, while Node integration tests exercise the controller against a real TLS API.

## Accounts and recovery

For a separate configured deployment, create a founder with `npm run account -- create /absolute/private/control.sqlite founder`, supplying `FOUNDER_PASSWORD` securely in the environment. Passwords must be 16–256 characters. `recover` changes the password and revokes all sessions/grants; stop the services before recovery so existing tunnels are also terminated. There is no public signup or paid email recovery. Session lifetime is one hour and connection grants last up to five minutes. Reconnect issues a fresh grant; only one founder grant remains active. Expired access keeps proxy settings until the user explicitly disconnects.

The local recovery drill verifies CLI-driven restore, old credential rejection, new proxy authorization and preserved usage after copying an encrypted backup between isolated local directories. Actual off-host retrieval and deployed rollback remain outstanding. [Recovery commands and drill](../scripts/README.md)

## Traffic and privacy boundary

The proxy supports HTTP port 80 and HTTPS CONNECT port 443 with public IPv4/IPv6 destinations. Tests use explicit narrowly scoped local policies for controlled targets. Browsing-site TLS is not intercepted. All DNS answers are checked and a validated address is pinned for the socket. Private, special-use, loopback and metadata addresses are denied. Credentials are matched only to the exact configured proxy host and port.

The exact HTTPS control API origin deliberately bypasses the browsing proxy. Incognito, other applications, browser-internal traffic and OS networking are not protected. WebRTC settings are mitigated, not leak-certified. Failure tests show the extension does not explicitly choose direct fallback; they do not establish a browser-global kill switch. DNS, WebRTC, IPv6, sleep/wake, real network changes and policy conflicts require owner-browser release tests.

Quota accounting is a conservative application limit, not a provider billing meter. TLS/IP overhead, unauthenticated handshakes, operating-system updates, management traffic and denied incoming data may still consume bandwidth. No $0 live-host guarantee exists until actual provider controls and billing are checked.
