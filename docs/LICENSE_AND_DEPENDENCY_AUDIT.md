# License and dependency audit — commercial-use planning

Observed 2026-11-15. This document is an engineering inventory, not legal advice. Final commercial distribution terms and the repository's own license require owner/legal approval.

## Current selected dependency set

The browser-proxy MVP deliberately keeps a small dependency surface.

| Component | Exact selected version | Repository | License | Commercial-use obligations / notes | Security and test evidence |
| --- | --- | --- | --- | --- | --- |
| proxy-chain | `3.0.3` | https://github.com/apify/proxy-chain | Apache-2.0 | Commercial use permitted; retain license and applicable notices; state modifications when distributing modified upstream code | Runtime integration tests cover HTTP, CONNECT, auth, TLS, revocation, quotas and socket cleanup |
| ipaddr.js | `2.3.0` | https://github.com/whitequark/ipaddr.js | MIT | Commercial use permitted; retain copyright and permission notice | Destination-policy tests cover private, special-use, mapped IPv4/IPv6 and DNS-pinning behavior |
| @playwright/test | `1.65.0` | https://github.com/microsoft/playwright | Apache-2.0 | Development-only; retain applicable license/NOTICE when redistributing relevant artifacts | Browser/UI tests; upstream 1.65.1 exists but is not auto-adopted |
| @types/chrome | `0.3.7` | DefinitelyTyped package | MIT | Development-only; retain notice if redistributed | Type checking only |
| @types/node | `24.19.2` | DefinitelyTyped package | MIT | Development-only | Type checking only |
| TypeScript | `7.0.2` | https://github.com/microsoft/TypeScript | Apache-2.0 | Development/build tooling; retain license/NOTICE as applicable | Strict `tsc --noEmit` |
| Node.js runtime | `24.22.1` project pin | https://github.com/nodejs/node | mixed upstream project notices | Review runtime redistribution obligations if bundling Node; currently operator-provided runtime | Built-in HTTPS, crypto and SQLite are used; no custom crypto protocol |

The lockfile records exact npm tarball URLs and integrity hashes. `private: true` prevents accidental npm publication but does not define product licensing.

## Candidate catalog — license and selection status

| Candidate | Current observed version/ref | License | Decision | Commercial / security note |
| --- | --- | --- | --- | --- |
| wxt-dev/wxt | `wxt-v0.21.5` | MIT | Deferred | Commercial-friendly, but unnecessary migration for current small extension |
| SuperPlugs/SuperTunnel | `v0.1.0` | MIT | Reference only | Avoid copying whole product/controller; use concepts only |
| Windscribe/browser-extension-mv3 | audited commit `cfb2915...` | root MIT | Reference only | Root license does not automatically settle bundled submodule/assets; no source copied |
| 3proxy/3proxy | `1.0.3` | upstream multi/alternative license text | Not selected for MVP | License choice and daemon integration add review work; current proxy adapter is already tested |
| OutlineFoundation/outline-server | `server-v1.12.3` release | Apache-2.0 | Deferred | Shadowsocks/Outline architecture is not a drop-in Chrome HTTPS forward proxy |
| OutlineFoundation/outline-apps | `v1.10.1` release; newer HEAD audited | Apache-2.0 | Future reference | Native/mobile product architecture only |
| WireGuard/wireguard-go | audited commit `b3bc704...` | MIT | Future native selection candidate | Repin and re-audit at native implementation; requires OS privileges and platform-specific kill-switch/DNS work |
| better-auth/better-auth | `v1.7.25` | MIT | Deferred | Upstream supports only latest; recent high/critical advisories reinforce careful upgrade discipline |
| keycloak/keycloak | `26.8.2` | Apache-2.0 | Rejected for founder MVP | Operationally heavy for one account; reconsider for enterprise IAM only |
| 0xERR0R/blocky | `v0.36.0` | Apache-2.0 | Deferred | Candidate for later DNS filtering; do not combine with another DNS framework without a distinct need |
| AdguardTeam/dnsproxy | `v0.86.0` | Apache-2.0 | Deferred | Candidate for encrypted DNS/proxy needs, not required merely for blocklists |
| shadcn-ui/ui | `shadcn@4.23.0` | MIT | Deferred | Copy-in component model still creates ongoing dependency/style maintenance; current UI is too small to justify it |
| caddyserver/caddy | `v2.11.9` | Apache-2.0 | Deployment candidate | Current release includes security fixes; pin only when a real host/domain/TLS deployment is approved |
| prometheus/prometheus | `v3.16.0` | Apache-2.0 | Deferred | Too much operational surface for one founder gateway |
| gitleaks/gitleaks | `v8.30.1` | MIT | Selected next security-tooling milestone | Project states feature development is complete and future releases focus on security patches; pin exact version/action and verify scan |
| aquasecurity/trivy | `v0.76.2` | Apache-2.0 | Deferred | Useful when images/filesystems/native packages exist; database download and CI time are unnecessary for current narrow npm service |
| Mullvad app | audited commit in REPO_AUDIT | GPL-3.0 | Reference only | Do not copy code into a proprietary/undecided-license product without an explicit copyleft compliance decision |
| Proton VPN browser extension | audited commit in REPO_AUDIT | GPL-3.0 | Reference only | Same copyleft boundary; UX concepts may be studied, source not copied |

## Project-license boundary

The repository does not currently contain a general project `LICENSE`. Public visibility is **not** a license grant. Before accepting substantial external contributions or distributing proprietary/commercial builds, choose the product/source licensing model explicitly.

Do not copy GPL code from reference projects into the current codebase unless the owner intentionally chooses a compatible distribution model and fulfills the corresponding obligations.

## Security-advisory policy

1. Keep runtime versions exact in the lockfile.
2. Review upstream releases/advisories on a scheduled basis; do not auto-upgrade production.
3. Upgrade when a security issue, compatibility defect, browser change, or tested maintenance reason applies.
4. Run focused tests first, then the complete verification suite for lockfile changes.
5. Record the reason, version, license change, transitive dependency change and test evidence in the PR.
6. Do not claim a clean security audit from `npm audit`, Gitleaks, or Trivy alone; each is one signal.

Historical evidence from 2026-11-13 recorded `npm audit` with zero advisories for the locked tree. Re-run it on the commit proposed for merge/release.
