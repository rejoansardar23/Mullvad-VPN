# Repository audit — 2026-11-15

## Scope

This audit is the required research pass before additional VPN-platform implementation. It evaluates the actual repository state, the already-built browser-proxy prototype, current branch history, dependency choices, verification evidence, and the open-source shortlist.

Audited repository: `rejoansardar23/vpn`.

Audited implementation baseline: `feat/tested-private-browser-proxy`, current observed HEAD `15c8fb910aa751851a02995a13aa53435786020d`.

## Executive findings

1. **Do not restart the product.** The feature branch already contains a functioning TypeScript control API, SQLite founder account, TLS forward proxy, Chrome MV3 extension, private operations UI, packaging, recovery tooling, CI configuration, and a substantial automated test suite.
2. **Do not migrate the extension to WXT now.** The current extension is small, typed, and directly uses official Chrome APIs. Replacing it with a framework would add migration and supply-chain cost without a demonstrated MVP defect.
3. **Keep the current proxy adapter for this milestone.** `proxy-chain@3.0.3` plus `ipaddr.js@2.3.0` already supports the tested HTTP/CONNECT forwarding, per-request authorization hooks, DNS pinning, destination policy, revocation, concurrency, and quota integration required by the browser-proxy MVP. 3proxy remains a valid alternative, not a reason to rewrite working code.
4. **Do not add Better Auth, Keycloak, shadcn/ui, Caddy, Prometheus, Blocky, dnsproxy, Outline, or WireGuard to the current browser-proxy milestone unless a concrete requirement needs them.**
5. **Playwright remains selected and pinned at 1.65.0.** Upstream 1.65.1 exists, but its published fixes do not by themselves justify changing a passing lockfile. Upgrade only after an affected test or security reason is identified.
6. **Gitleaks is the best next small security-tooling reuse candidate** because the repository is currently public and the project handles credentials. Integrate it separately, pinned, and prove the scan result before claiming coverage.
7. **The repository is currently public, not private.** That conflicts with the stated commercial-private-monorepo objective. Do not change visibility automatically; the owner should make that account-level decision.
8. **The current implementation HEAD has independent CI evidence.** GitHub Actions run `43648138870` completed successfully at `15c8fb9`; frozen install, TypeScript, test, build, package, checksum/archive, npm-audit and whitespace steps all passed. The preceding full test evidence records 57/57 tests passing with zero skipped, including actual MV3 worker loading on the GitHub runner.

## Repository inventory

| Area | Current implementation | Audit result |
| --- | --- | --- |
| Browser extension | Original TypeScript Chrome MV3 popup/worker/controller using official `chrome.proxy`, storage, privacy, alarms and webRequest auth APIs | **Keep** |
| Control API | Node 24 TypeScript HTTPS service, closed founder login, bearer sessions, gateway/grant endpoints, origin checks, rate limits | **Keep** |
| Identity store | Built-in `node:sqlite`, scrypt password hashing, hashed session/grant secrets, recovery | **Keep for founder-only MVP** |
| Gateway | `proxy-chain@3.0.3` HTTPS forward proxy + project policy hooks | **Keep** |
| Destination safety | `ipaddr.js@2.3.0`, public-only address policy, DNS answer validation/pinning, port 80/443 restrictions | **Keep and continue negative tests** |
| Operations UI | Small project-owned HTML/CSS/JS served by control API | **Keep; no UI framework needed yet** |
| Browser tests | `@playwright/test@1.65.0` plus Node tests | **Keep** |
| CI | GitHub Actions workflow with frozen install, types, tests, build, package, audit and whitespace checks | **Needs a passing run on current HEAD** |
| Deployment | Config runner, systemd/nftables examples | **Not production-verified** |
| US exit | No authorized live US host | **Blocked** |
| Full-device VPN | Not implemented | **Correctly deferred** |

## Branch and release state

Observed branches:

- `main`: documentation baseline.
- `feat/tested-private-browser-proxy`: implementation line.
- This audit branch: documentation-only research pass based on the feature branch.

At audit time there were no open pull requests. The feature branch includes newer commits after the original 2026-11-13 validation record, including CI setup and expanded special-use IPv4/IPv6 denial tests.

## Current upstream observations

These are audit observations, not automatic dependency upgrades.

| Candidate | Current observed release/ref | License evidence | MVP decision |
| --- | --- | --- | --- |
| wxt-dev/wxt | `wxt-v0.21.5` | MIT | Defer; no migration of working thin extension |
| SuperPlugs/SuperTunnel | `v0.1.0` | MIT | Reference only |
| Windscribe/browser-extension-mv3 | audited commit `cfb2915...` | root MIT; submodule/assets require separate review | Reference only |
| apify/proxy-chain | `v3.0.3` | Apache-2.0 | **Selected runtime** |
| whitequark/ipaddr.js | `2.3.0` npm release | MIT | **Selected runtime** |
| 3proxy/3proxy | `1.0.3` | BSD-style / alternative grants documented upstream | Evaluated alternative; not selected |
| better-auth/better-auth | `v1.7.25` | MIT | Defer; founder-only auth is already narrower |
| keycloak/keycloak | `26.8.2` | Apache-2.0 | Reject for MVP complexity |
| shadcn-ui/ui | `shadcn@4.23.0` | MIT | Defer |
| microsoft/playwright | upstream `v1.65.1`; repo pin `1.65.0` | Apache-2.0 | **Selected dev tool; keep pin pending need** |
| gitleaks/gitleaks | `v8.30.1` | MIT | **Selected next security milestone, not yet integrated** |
| aquasecurity/trivy | `v0.76.2` | Apache-2.0 | Defer until container/native image scanning is useful |
| caddyserver/caddy | `v2.11.9` | Apache-2.0 | Deployment candidate only |
| prometheus/prometheus | `v3.16.0` | Apache-2.0 | Defer for multi-node operations |
| 0xERR0R/blocky | `v0.36.0` | Apache-2.0 | Defer DNS-filtering phase |
| AdguardTeam/dnsproxy | `v0.86.0` | Apache-2.0 | Defer; do not pair with Blocky by default |
| WireGuard/wireguard-go | audited commit `b3bc704...` | MIT | Native phase only; repin at implementation time |
| OutlineFoundation/outline-server | `server-v1.12.3` release; newer audited HEAD exists | Apache-2.0 | Protocol mismatch for Chrome HTTPS proxy MVP |
| OutlineFoundation/outline-apps | `v1.10.1` release; newer audited HEAD exists | Apache-2.0 | Future native reference only |

## Security and maintenance observations

- The browser extension correctly avoids claiming OS-wide VPN protection and does not allow incognito mode.
- Proxy credentials are short-lived, scoped to the configured proxy challenge, stored in Chrome session storage, and backed by server-side grant enforcement.
- The gateway blocks private/special-use targets, pins a validated DNS answer, limits ports and sockets, enforces quota and active revocation, and does not intercept destination TLS.
- The control API uses HTTPS, closed signup, request-size limits, origin checks, rate limits and short-lived sessions.
- The primary unresolved security questions are real-browser leak behavior, production host firewalling/TLS lifecycle, live-route validation, supply-chain secret scanning, and public-repository exposure.
- Better Auth remains a future candidate, but its upstream security page shows recent high/critical advisories and states only the latest version is supported. That reinforces avoiding unnecessary auth-framework adoption for the one-founder prototype.

## Evidence limits

Validation now includes independent GitHub Actions evidence: run `43647697066` recorded 57/57 passing tests at `91e90c1`, including actual MV3 worker loading, and current-head run `43648138870` completed all workflow steps successfully at `15c8fb9`. This still does not prove owner-device live proxy routing or a real US exit.

This audit environment could inspect GitHub through the connected repository integration, but direct network access from the execution container was unavailable, so a fresh local clone/test run could not be produced here. A passing GitHub Actions run on the reviewed commit is the preferred next evidence.

## Audit conclusion

The credit-saving path is **incremental hardening of the existing implementation**, not a framework rewrite or repository combination. Finish the current browser-proxy acceptance gates, add narrowly justified security tooling, then move to live US deployment only after the owner supplies an authorized zero-incremental-cost host and approves the operational setup.
