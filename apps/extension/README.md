# Private Route Chrome extension

Original TypeScript Manifest V3 extension with no runtime npm dependencies, using Chrome's official proxy, webRequest authentication, privacy, alarms and session storage APIs. This is a browser proxy, not a full-device VPN. No third-party extension source or branding is copied.

From the repository root, run `node apps/extension/build.js`. In Chrome open `chrome://extensions`, enable Developer Mode, choose **Load unpacked**, and select `dist/extension`. There is no store publication or fee. Enter your own HTTPS control API origin and founder credentials in the popup. Local development needs its generated CA trusted by the test browser; never disable certificate verification.

The control API must return an approved gateway with `scheme: "https"`, a separate HTTPS route verifier returning `{ "ip": "..." }`, an expected IP and `live: true` only after an authorized US host is verified. A `live: false` gateway is explicitly labelled **LOCAL FIXTURE**, and its successful route check is **Fixture verified**, never a US connection.

Connect requests a short-lived per-connection grant, sets a single HTTPS proxy with no configured direct fallback, restricts WebRTC non-proxied UDP and verifies the expected exit IP. Authentication credentials are returned only for a Basic **proxy** challenge from the exact configured host and port. Account tokens and proxy credentials use `chrome.storage.session` restricted to trusted extension contexts; passwords are never persisted to disk by extension code. Only the API origin and nonsecret restoration metadata use `chrome.storage.local`.

The exact HTTPS control API host and port deliberately bypass the proxy, so revoke/login/disconnect still work during a gateway outage. Chrome's default implicit loopback bypass is removed using `<-loopback>`. The verifier cannot share the control API origin. The control-plane exception and browser-originated background traffic mean this is not a browser-global or operating-system kill switch. Incognito is unsupported and disabled for the extension. DNS, browser-internal traffic, WebRTC/IPv6 leaks, device restarts and live network changes need the full manual release checklist; a passing route check does not establish those properties.

Grant expiry, verifier failure and proxy errors preserve proxy settings and show an error; they do not explicitly switch to direct routing. **Disconnect & restore routing** is the user's explicit return to ordinary browsing. Settings are cleared only while Chrome reports this extension owns its exact proxy configuration. WebRTC settings are restored only while still owned. After a browser restart session credentials are intentionally gone; the popup explains that stale proxy settings remain and lets the owner disconnect or sign back in. Service-worker wakeup reloads session state and verifies again.

Permissions: `proxy` changes browser routing; `webRequest` and `webRequestAuthProvider` handle scoped proxy challenges; `privacy` reduces non-proxied WebRTC UDP; `alarms` schedules route/expiry checks; `storage` stores ephemeral sessions and restoration metadata. Broad HTTP/HTTPS host access is needed for proxy-auth observation for browsing sites, HTTPS API requests and route verification. Only HTTPS origins are accepted for the control API and verification. Repeated authentication challenges for a request are cancelled after one credential submission. No content scripts, telemetry, remote executable code, external messaging, public signup or shared gateway password are included.

Run `node --test tests/extension/extension.test.js tests/extension/extension-browser.test.js` for focused lifecycle/auth checks and browser UI smoke. The managed Chromium in this cloud environment enforces `ExtensionInstallBlocklist: ["*"]`: actual unpacked MV3 load and browser proxy/auth integration are blocked, and the test reports that as skipped. Its separate popup smoke runs real Chromium with an explicitly simulated extension runtime. These checks do not establish live Chrome routing or leak protection. Test in an owner-controlled Chrome profile that permits unpacked development extensions before release; do not weaken managed browser policies.

For T01 acceptance, use an authorized Linux runner with a Chromium executable that permits command-line loading of unpacked extensions, plus OpenSSL and NSS `certutil` (`libnss3-tools` on Debian and Ubuntu). From the repository root, after the frozen dependency install, run:

```sh
CHROMIUM_PATH=/absolute/path/to/authorized/chromium REQUIRE_MV3_ACCEPTANCE=1 \
  node --test tests/extension/extension-browser.test.js tests/extension/chromium-route.test.js
```

Acceptance requires all three tests to pass with zero skips, including actual MV3 loading and authenticated loopback HTTP and HTTPS forwarding. A known managed browser restriction or missing NSS tooling fails this run. The browsers use disposable test profiles, and the routing test imports its test certificate only into a disposable trust store. Record the commit, OS, browser version and test counts with the results.
