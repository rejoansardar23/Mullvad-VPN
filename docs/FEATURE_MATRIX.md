# Feature matrix

The active product is a single-founder browser-proxy prototype. The evidence below is from local development checks. See [the validation report](VALIDATION_2026-11-18.md) for counts and test boundaries.

| Platform | Capability | Source | Status and evidence | Remaining work |
| --- | --- | --- | --- | --- |
| Browser | Chrome MV3 popup, background worker, login, gateway selection and connection feedback | `apps/extension/{manifest.json,popup.ts,worker.ts,core.ts}` | Implemented. Chromium renders the popup with a simulated extension runtime. Controller and worker tests cover message and state handling. | Load the actual extension on a permitted runner. |
| Browser | HTTPS control API and ephemeral credentials | `apps/extension/core.ts` | Implemented. Controller and real TLS integration tests cover origin validation, session storage, logout and restart behavior. | Validate actual browser restarts and session loss on owner devices. |
| Browser | Proxy settings, control-origin bypass and explicit restoration | `apps/extension/core.ts` | Implemented. Controller tests check single HTTPS proxy configuration, ownership conflicts and restoring settings owned by the extension. | Run actual browser traffic and restoration checks. |
| Browser | Proxy authentication and repeated challenge cancellation | `apps/extension/{core,worker}.ts` | Implemented. Worker tests check Basic authentication for the exact gateway host and port, expiry and challenge repeats. | Exercise the actual browser event path. |
| Browser | Exit verification, expiry and failure feedback | `apps/extension/{core,worker}.ts` | Implemented. Tests cover expected exit IP, fixture label, expiry while verifying, gateway failure and proxy or WebRTC policy changes. Error states preserve the explicit disconnect path. | Verify real exit, browser network transitions, DNS, IPv6 and WebRTC on an authorized runner. |
| Browser | Edge and Firefox variants | `apps/extension/` contains the Chrome manifest only | Unverified for Edge and other Chromium browsers. Firefox requires validating background events, proxy and authentication APIs, privacy controls and session storage with its own manifest or adapter. | Run equivalent real-traffic and restoration tests per browser before advertising support. |
| Control API | Founder login/logout, rate limits, HTTPS, CORS and exact extension origins | `services/control-api/{server,store}.ts` | Implemented. TLS API tests cover unauthorized requests, malformed input, limits, session lifecycle, transactional logout retry and closed signup. | Managed deployment certificate, firewall and failure acceptance. |
| Control API | Gateway directory, short-lived grants, replacement and revocation | `services/control-api/{server,store}.ts` | Implemented. TLS API and integration tests cover issuance, replacement, cross-session founder revocation and forwarding with an issued grant. | One authorized live exit and operational health evidence. |
| Storage | Hashed credentials, SQLite account/grant state, retention and durable byte quotas | `services/control-api/store.ts` | Implemented. Tests cover scrypt and secret hashes, expiry, persistence, old schema migration and atomic usage writes. | Document live retention and storage controls for each deployed host. |
| Gateway | TLS proxy authorization, HTTP forwarding, HTTPS CONNECT | `services/gateway/index.js` | Implemented. Gateway tests forward real local traffic, require trust and enforce grant expiry, revocation, quotas and connection caps. | Validate actual browser routing and live endpoint behavior. |
| Gateway | Destination limits, IPv4/IPv6 handling and pinned DNS | `services/gateway/{index,policy}.js` | Implemented. Tests cover denied private and special-use addresses, mixed DNS answers and pinned forwarding. Fixture exception is limited to explicit local mode. | Validate owner-host DNS, routes and firewall behavior. |
| Operations | Founder sign-in, usage, gateway display, grant status, revoke and logout | `apps/operations/`, `services/control-api/server.ts` | Implemented. Chromium tests render state and actions. A separate real TLS test confirms exhausted grants are inactive in the API and denied by storage authorization. | Verify with the deployed owner configuration. Public accounts, billing and enrollment are planned. |
| Recovery | Encrypted SQLite backup and validated restore | `scripts/recovery/backup.mjs` | Implemented. Tests cover authenticated encryption, tamper rejection, overwrite protection and an encrypted CLI handoff between two isolated local directories. | Off-host backup and deployment rollback drill. |
| Recovery | Founder password replacement with session and grant invalidation | `services/control-api/{cli,store}.ts` | Implemented. SQLite fault injection verifies rollback of all writes and successful retry. Recovery requires stopped database consumers. | Owner-run restore/rotation drill on the target host. |
| Runtime | Private loopback development, trusted TLS and optional verifier fixture | `scripts/development/dev.mjs` | Implemented. Runtime tests cover repeatable initialization, trusted TLS, fixture forwarding and bind-conflict cleanup. | External owner-browser smoke test. |
| Runtime | Configured API and gateway, private management, file/preflight checks | `infrastructure/` | Implemented. Local tests cover startup/restart, path validation and offline shared-certificate checks. | Owner-approved host, trusted TLS, provider terms/cost and release checks. |
| Packaging | Deterministic extension ZIP, checksum and notices | `apps/extension/build.js`, `scripts/packaging/package.mjs` | Implemented. Build, reproducibility, allowlist, checksum and ZIP checks pass locally. | Signing, update authority and store acceptance. |
| Source tooling | Checksum-verified archive extraction and tracked-project inventory | `tools/`, `upstream/archives/`, `docs/repository/` | Implemented. Python tests exercise archive and inventory safeguards. Preserved native trees were verified read-only. | Keep release provenance separate from local source identity checks. |
| Native | Android, Linux, Windows and macOS full-device tunnels | `upstream/archives/` | Upstream source only. No tracked product implementation. | See native feasibility below. |
| Service | Public VPN regions, account enrollment, device management and billing | [Project idea](../PROJECT_IDEA.txt) | Planned. The prototype implements private founder sessions and a local proxy fixture. | Complete owner-browser and native acceptance before public product work. |

## Native platforms and upstream provenance

The tracked product implements a browser proxy. Android, Windows, Linux and macOS tunnel clients are planned. The two ZIPs in `upstream/archives/` contain external implementations for study.

| Archive | Committed SHA-256 | Matched upstream revision | Comparison |
| --- | --- | --- | --- |
| Mullvad | `95d77642fd18ded01423c9bf125f22159479dfd058dbb801cf286f425d98ba6f` | `d84a4d947b2715d44c9b8f49a18491e332ff55c0` | 10,248 entries, zero differences |
| Amnezia | `f32e784d47c196158728eee8df7aeef01093df6368ebc72a142d0829a9cebcd0` | `5aff2ce5809514ef7c292ac5e7ed3758d7d0b333` | 1,767 entries, zero differences |

Both tracked blobs match the original project commit `c56abaf`. HTTPS codeload archives fetched by the exact revisions matched the embedded ZIP comments and every member's path, Unix mode, size and SHA-256 after stripping only the outer directory. This includes symlink text. The exact commit trees were also fetched over HTTPS without checkout. Upstream signatures and child repository contents were outside those checks.

| Upstream Git link | Pinned commit |
| --- | --- |
| Mullvad `dist-assets/binaries` | `48ee0bab6ca6f12ca7ab745cd7af1ac22cabe6fd` |
| Mullvad `ios/wireguard-apple` | `3cf9a523bb4bdb46fcba08566a8c587de6f6d0b0` |
| Amnezia `client/3rd/SortFilterProxyModel` | `f2881493e42bd7b7d5b7abe804dad084dd610b71` |
| Amnezia `client/3rd/amneziawg-apple` | `bdaf0b337b85c815e1dc462505455155b6cdfe79` |
| Amnezia `client/3rd/qtgamepad` | `f72b3e0c6229d1622b6bc7f6a5ec5ccff83460eb` |
| Amnezia `client/3rd/qtkeychain` | `7460df6a978669290de5b56c2d98b199b61c3f88` |

Both sources include GPLv3 license texts. Mullvad's Rust workspace declares GPL-3.0-or-later. Amnezia records additional third-party terms in `THIRD_PARTY_LICENSES.md`. Before shipping a linked or modified component, determine its license and corresponding source and notice obligations. The project still needs a license decision and its own branding, endpoint, signing and update authority. [Licensing](LICENSING.md)

### Linux build and runtime

The smallest candidate for T03/T04 is the upstream `mullvad-cli` package's `mullvad` binary with `custom-vpn`. `mullvad-cli/src/main.rs` exposes the custom configuration commands and `--help`/ `--version` through Clap. Those flags allow a nonprivileged smoke check without starting a daemon. The daemon's `src/tunnel.rs` contains a custom endpoint path that bypasses relay selection. Vendor API or account independence at daemon startup still needs verification.

The Debian 13 x86-64 host provided GCC, make and pkg-config. Rust and Cargo 1.100.0 and Protobuf 3.21.12 were verified and installed in scratch space for the build. The selected locked graph, including `udp-over-tcp@06e6438d3a2537786efde7185f5675ce5e38d45e`, compiled offline with two jobs. The available C toolchain was sufficient for AWS-LC on this target.

In the verified source copy outside this repository's Git root, the locked Linux CLI build and both nonprivileged smoke checks passed. The daemon needs additional Linux dependencies, including `libdbus-1-dev`, and the upstream packaging path checks for `libmnl.a` and `libnftnl.a` from the pinned binaries submodule. [Build instructions and evidence](NATIVE_LINUX_BUILD.md)

Run `python3 -B tools/check_native_host.py` on a candidate Linux runtime. This environment has `ip` and lacks `/dev/net/tun`, effective `CAP_NET_ADMIN` and `wg`. Real testing requires an authorized isolated Linux runtime and WireGuard endpoint. Exercise DNS, IPv4/IPv6 routing, outage cases, revocation, restart and route, interface and resolver restoration.

The archived custom VPN CLI can expose private keys in displayed output or command arguments. The archived Unix daemon also needs an explicitly restricted management socket. A tracked adapter must keep keys out of arguments and diagnostics and verify socket access before using real keys.

### Android, Windows and macOS

- **Android** — Both upstreams contain Android code. Mullvad pins Java 21, SDK 37, NDK 27.3.13750724, Gradle 9.8.2 and the Rust toolchain. Amnezia uses Qt/CMake and Kotlin VPN services. This environment has a Java 21 runtime but lacked the JDK compiler, Android SDK, ADB and a device/emulator. A tracked implementation should use Android `VpnService` with a maintained WireGuard backend and protected key/configuration storage. Validate permission denial, revoke/logout, reconnect, network switches, DNS and IPv4/IPv6 on an authorized device.
- **Windows and macOS** — The separate upstream desktop UI and platform daemons are reference sources. Independently validate a tracked daemon/interface design, Windows service and WFP permissions, and macOS Network Extension or privileged service, entitlements and signing. Each platform needs native build and routing tests before support claims.

### Browser compatibility

Chrome MV3 is the current target, with minimum Chrome 120. The package uses a module service worker, Chromium `proxy.settings`, `webRequestAuthProvider` and asynchronous proxy authentication, `storage.session`, and a WebRTC privacy setting. An Edge or other Chromium smoke should use an authorized unpacked-extension profile to verify those APIs, an authenticated HTTPS route, expiry, and settings restoration. Firefox requires separately validating the supported background entry point, proxy configuration interface, authentication listener and permissions, and privacy and session semantics. No other browser was validated.
