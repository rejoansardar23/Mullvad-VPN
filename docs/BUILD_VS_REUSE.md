# Build vs reuse — selected stack and research policy

Updated 2026-11-15 after auditing the current implementation and upstream catalog. This file is the canonical decision summary for **what we reuse, what we keep project-owned, and what we deliberately defer**. Detailed evidence is in [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md), [REPO_AUDIT.md](REPO_AUDIT.md), [LICENSE_AND_DEPENDENCY_AUDIT.md](LICENSE_AND_DEPENDENCY_AUDIT.md), and [DEPENDENCY_LICENSE_MATRIX.md](DEPENDENCY_LICENSE_MATRIX.md).

## Decision rule

Reuse mature open-source software when it removes substantial engineering/security maintenance **and** fits the exact capability. Do not add a framework merely because it is popular. Do not combine two frameworks that solve the same problem without a measured requirement. A working, small module is not rewritten unless tests, security evidence, browser compatibility, or maintenance cost demonstrate a problem.

For every new dependency or service, record the exact version/ref, license, feature coverage, integration effort, selection/rejection reason, security concerns, and automated test strategy before implementation.

## Current MVP selections

| Capability | Selected component / exact version | License | Feature coverage | Integration effort | Decision and security concerns | Automated test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| Chrome extension foundation | Project-owned TypeScript MV3 code + official Chrome APIs; `@types/chrome@0.3.7` | Project license undecided; Chrome types MIT | Proxy configuration, proxy authentication, popup state, session/local storage, alarms, WebRTC mitigation, route verification | **Low; already implemented** | **Keep.** No framework migration without a concrete defect. Client is inspectable; never embed durable gateway secrets. | Controller/unit tests, popup/browser tests, real owner-Chrome lifecycle/proxy acceptance |
| Forward proxy | [apify/proxy-chain](https://github.com/apify/proxy-chain) `3.0.3` | Apache-2.0 | HTTPS proxy listener, HTTP forwarding, CONNECT, per-request hooks, controllable DNS lookup | **Low/medium; already integrated** | **Keep.** Project code supplies grant authorization, policy, quota and revocation. No website TLS interception. | HTTP/CONNECT/TLS/auth/revocation/quota/socket tests |
| IP classification | [whitequark/ipaddr.js](https://github.com/whitequark/ipaddr.js) `2.3.0` | MIT | IPv4/IPv6 parsing and range classification | **Low; already integrated** | **Keep.** Project adds explicit special-use ranges and DNS-pinning policy. | Private/link-local/special-use/mapped IPv4/IPv6 and DNS-rebinding tests |
| Founder authentication/state | Node `24.22.1` built-ins: `node:crypto`, `node:sqlite`; project-owned thin API | Node project notices + project license undecided | One founder, scrypt password hashing, random bearer sessions, short-lived grants, recovery | **Low; already implemented** | **Keep for founder-only MVP.** Do not add OAuth/email/SMS or a general IAM framework yet. | Login failure/rate limit/session expiry/recovery/grant tests |
| MVP UI | Project-owned HTML/CSS/JS | Project license undecided | Small extension popup + private operations/help page | **Low; already implemented** | **Keep.** A component framework does not repay migration cost yet. | DOM/browser checks and API integration tests |
| Browser testing | [microsoft/playwright](https://github.com/microsoft/playwright) `1.65.0` | Apache-2.0 | Chromium UI and extension-oriented browser testing | **Low; already integrated** | **Keep current pin.** Upstream `1.65.1` exists; upgrade only for a relevant fix/security/compatibility need. | Existing browser tests; complete suite for version changes |
| Secret scanning | [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) `v8.30.1` | MIT | Full Git-history secret-pattern scanning | **Low; CI adapter only** | **Integrated as pinned CLI, pending latest-run evidence.** The Linux x64 archive is checksum-pinned; the separately licensed Gitleaks Action is not used. | Full-history scan before Node install; any finding/error fails CI |

## Evaluated catalog

| Capability | Candidate / current observed release or audit ref | License | Coverage and integration effort | Decision | Security / test requirement |
| --- | --- | --- | --- | --- | --- |
| Extension framework | [wxt-dev/wxt](https://github.com/wxt-dev/wxt) `wxt-v0.21.5` | MIT | Strong MV3 tooling and cross-browser scaffolding; **medium migration** from working direct APIs | **Defer** | Reconsider only for Firefox/Edge/build complexity; migration must pass the same routing/auth/browser tests |
| Browser proxy reference | [SuperPlugs/SuperTunnel](https://github.com/SuperPlugs/SuperTunnel) `v0.1.0` | MIT | Useful controller/profile reference; does not supply our control plane, grant policy or gateway | **Reference only** | No wholesale repo import |
| Advanced extension reference | [Windscribe/browser-extension-mv3](https://github.com/Windscribe/browser-extension-mv3), audited commit `cfb2915…` | Root MIT; submodule/assets need separate review | Mature product patterns but vendor-specific APIs/build and larger dependency surface | **Reference only** | Audit per-file/assets before any reuse; no source copied now |
| Proxy daemon | [3proxy/3proxy](https://github.com/3proxy/3proxy) `1.0.3` | Upstream BSD-style / alternative grants | Auth/ACL/TLS daemon; dynamic grant/reload integration would be **medium/high** | **Not selected for MVP** | Only revisit if proxy-chain demonstrates a measurable performance/security/operations limitation |
| Shadowsocks server | [OutlineFoundation/outline-server](https://github.com/OutlineFoundation/outline-server) `server-v1.12.3` release; newer HEAD previously audited | Apache-2.0 | Different protocol/control model; **high** integration for Chrome HTTPS-forward-proxy milestone | **Defer** | Not interchangeable with official Chrome HTTPS proxy settings |
| Native client reference | [OutlineFoundation/outline-apps](https://github.com/OutlineFoundation/outline-apps) `v1.10.1` release; newer HEAD previously audited | Apache-2.0 | Desktop/mobile architecture reference | **Future reference** | Re-audit version/dependencies when native work starts |
| Native VPN engine | [WireGuard/wireguard-go](https://github.com/WireGuard/wireguard-go), audited commit `b3bc704…` | MIT | Real VPN tunnel implementation; requires OS privileges and per-platform networking | **Preferred future candidate, not current dependency** | Repin at native phase; kill-switch/DNS/roaming tests per OS |
| Authentication framework | [better-auth/better-auth](https://github.com/better-auth/better-auth) `v1.7.25` | MIT | Rich account/session/OAuth ecosystem; **medium** migration and larger attack surface | **Defer until external users** | Review latest advisories and use supported latest exact release at adoption time; full auth regression tests |
| IAM platform | [keycloak/keycloak](https://github.com/keycloak/keycloak) `26.8.2` | Apache-2.0 | Enterprise IAM/federation; **high** operational cost | **Reject for founder MVP** | Reconsider only for enterprise/federated identity requirements |
| UI components | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) `shadcn@4.23.0` | MIT | Broad reusable UI components; **medium** migration for tiny current UI | **Defer** | Adopt only when UI complexity measurably exceeds hand-maintained surface |
| DNS filtering | [0xERR0R/blocky](https://github.com/0xERR0R/blocky) `v0.36.0` | Apache-2.0 | Blocklist-oriented DNS filtering | **Defer** | If selected later, test DNS privacy, bypass/leaks, list failure and performance |
| DNS proxy | [AdguardTeam/dnsproxy](https://github.com/AdguardTeam/dnsproxy) `v0.86.0` | Apache-2.0 | DNS proxy/encrypted DNS protocols | **Defer** | Use instead of Blocky when encrypted DNS transport is the actual need; do not run both by default |
| HTTPS frontend | [caddyserver/caddy](https://github.com/caddyserver/caddy) `v2.11.9` | Apache-2.0 | TLS automation/reverse proxy | **Deployment candidate only** | Add only after authorized host/hostname exists; test renewal, headers, binding and rollback |
| Metrics | [prometheus/prometheus](https://github.com/prometheus/prometheus) `v3.16.0` | Apache-2.0 | Metrics/alerting ecosystem | **Defer** | One founder gateway does not justify another service; reconsider with multiple nodes/SLOs |
| Vulnerability scanner | [aquasecurity/trivy](https://github.com/aquasecurity/trivy) `v0.76.2` | Apache-2.0 | Container/filesystem/package scanning | **Defer** | Add when container/native artifacts make its coverage useful; pin scanner/database behavior |
| Native app reference | Mullvad VPN app, exact audited commit in [REPO_AUDIT.md](REPO_AUDIT.md) | GPL-3.0 | OS networking architecture reference | **Reference only** | No code copying without explicit copyleft/commercial distribution decision |
| Extension reference | Proton VPN browser extension, exact audited commit in [REPO_AUDIT.md](REPO_AUDIT.md) | GPL-3.0 | Mature extension patterns | **Reference only** | Same copyleft boundary; no source copied |

## Why WXT is not the current foundation

WXT is a strong maintained framework, but the current extension already has a very small surface: one popup, one worker, one typed controller and official Chrome APIs. Migrating now would consume engineering credits, alter packaging/runtime assumptions and require revalidating security-sensitive proxy/auth lifecycle behavior without adding a needed MVP capability.

Revisit WXT when at least one of these becomes true:

- Firefox/Edge support creates duplicated browser-build logic.
- Manifest/build complexity materially grows.
- Current custom build breaks on browser/toolchain changes.
- A measured maintenance problem costs more than migration.

Until then, the best extension foundation is the existing direct-MV3 implementation.

## Why proxy-chain remains selected

`proxy-chain@3.0.3` already provides the mature forwarding engine while project code retains product-specific control over authentication, DNS pinning, destination restrictions, quotas, revocation and accounting. 3proxy could be a good standalone daemon, but replacing a proven integration would require a new dynamic authorization/reload mechanism and a complete networking regression pass. No current evidence justifies that cost.

## Dependency change gate

Before adding or replacing a component:

1. Link the current unblocked requirement/task.
2. Search maintained upstream options and record exact release/ref.
3. Compare license/commercial obligations, maintenance, security history, feature fit and integration cost.
4. Select **one** primary solution unless multiple solutions serve distinct, documented roles.
5. Add the smallest adapter/configuration instead of vendoring an entire repository.
6. Run focused tests first; for networking/auth/lockfile changes run the complete verification suite.
7. Record actual evidence, rollback path and unfinished work.
8. Do not provision paid infrastructure or enable an advanced feature by default without owner approval.

## Future full-device boundary

A browser proxy is not a VPN tunnel. Native clients require a separate architecture using an established VPN protocol implementation such as WireGuard, OS networking privileges, platform-specific DNS/kill-switch/reconnect testing, signing/distribution and a separate threat model. Never rename the current extension into a full-device VPN.
