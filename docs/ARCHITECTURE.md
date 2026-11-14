# Architecture — authenticated USA-only browser proxy, with native VPN path

Updated 2026-11-15 after the open-source reuse audit. This document describes the **implemented architecture and explicit future boundaries**. The current product is a Chrome browser proxy prototype, not a full-device VPN.

## Architecture decision

For the current milestone, keep the smallest working stack:

| Layer | Selected implementation | Exact version / boundary |
| --- | --- | --- |
| Browser client | Project-owned TypeScript Manifest V3 extension using official Chrome APIs directly | Chrome MV3; `@types/chrome@0.3.7`; **no WXT migration now** |
| Control API | Project-owned TypeScript HTTPS service | Node `24.22.1` |
| Identity/state | Built-in `node:sqlite` + `node:crypto` scrypt/random secrets | One founder account; no public signup |
| Proxy data plane | `proxy-chain` | `3.0.3`, Apache-2.0 |
| IP policy | `ipaddr.js` plus project special-use policy | `2.3.0`, MIT |
| Browser test tooling | Playwright | Repo pin `1.65.0` |
| Secret scan | Gitleaks | Planned next small milestone, `v8.30.1` |
| Public TLS frontend | Caddy | Deferred deployment candidate `v2.11.9`; not a current runtime dependency |
| Native VPN | WireGuard implementation | Separate future architecture; repin when native work begins |

Detailed selection reasoning is in [BUILD_VS_REUSE.md](BUILD_VS_REUSE.md), [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md), and [LICENSE_AND_DEPENDENCY_AUDIT.md](LICENSE_AND_DEPENDENCY_AUDIT.md).

## Implemented system

`services/control-api` authenticates the founder, exposes the approved gateway list, issues short-lived connection grants, revokes grants, reports aggregate status and serves the private operations/help UI.

`services/gateway` wraps the mature `proxy-chain@3.0.3` forwarding engine. Project code enforces grant authorization, expiry, revocation, connection limits, byte quotas, destination policy and durable usage accounting. `ipaddr.js@2.3.0` assists address classification; project policy explicitly rejects private and special-use ranges, validates all DNS answers and pins a checked address into the outbound connection.

`apps/extension` is a small typed MV3 client using `chrome.proxy`, `chrome.webRequest`, `chrome.storage`, `chrome.privacy` and `chrome.alarms`. It stores only short-lived session/grant state, scopes authentication to the exact configured proxy challenge, checks proxy ownership, mitigates non-proxied WebRTC UDP, and declares Connected only after the configured HTTPS verifier reports the expected exit IP.

`apps/website` is the founder operations/help surface. It is intentionally small and does not justify shadcn or another UI framework yet.

## Control plane vs data plane

The control API does **not** carry browsing traffic.

```text
                    CONTROL PLANE
 Chrome MV3 extension --------------------> HTTPS control API
   login / gateways / grants / revoke          |
                                                +--> SQLite founder/session/grant state

                     DATA PLANE
 Chrome browser -- authenticated TLS proxy --> Gateway -- HTTP/CONNECT --> Internet
                      short-lived grant          |
                                                +--> destination policy
                                                +--> quota / concurrency
                                                +--> active revocation
                                                +--> aggregate usage
```

For HTTPS websites, the gateway forwards CONNECT. Destination TLS remains between Chrome and the destination website; the platform does not install a content-interception CA or decrypt site TLS.

## Browser extension lifecycle

Expected state flow:

```text
Disconnected
   |
   v
Connecting -- failure/ownership change/route mismatch --> Error
   |
   | proxy configured + expected exit IP verified
   v
Connected (or explicit Local fixture state)
   |
   | grant expiry / outage / verification failure
   v
Error with proxy settings retained
   |
   | explicit Disconnect
   v
Disconnected + only extension-owned settings restored
```

Retaining the proxy setting on an error avoids deliberately switching protected browser requests to a direct route. This behavior still **does not prove a universal browser kill switch**; real Chrome DNS/WebRTC/IPv6 and policy behavior must be accepted on the owner's device.

## Authentication and grant model

- One founder account; public signup is disabled.
- Password: scrypt hash with a random salt.
- Control session: random bearer token, stored hashed server-side, approximately one-hour lifetime.
- Proxy grant: independent random secret, stored hashed, approximately five-minute lifetime.
- One active founder grant at a time.
- Maximum four concurrent grant sockets.
- Replacement/logout/recovery revokes grants; gateway active revocation terminates sockets.
- Recovery changes the password and invalidates restored/current sessions and grants.

Better Auth is intentionally deferred until external users, MFA, account lifecycle, OAuth or entitlement complexity make a general auth framework cheaper than the thin founder implementation. Keycloak is not justified for the MVP.

## Destination and abuse controls

The data plane must never become an unrestricted public proxy.

Current controls include:

- proxy authentication required;
- TLS 1.2+ on the proxy listener;
- only HTTP port 80 and HTTPS CONNECT port 443;
- private, loopback, link-local, metadata, multicast and explicit special-use address denial;
- all DNS answers validated;
- checked DNS answer pinned so a second resolution cannot rebound to a private address;
- server-side grant expiry and active revocation;
- connection caps and byte quota;
- bounded retained grant/revocation state;
- request/header/idle timeouts;
- management/control interfaces intended to remain private.

Production host firewalling and public exposure remain unverified until a real authorized host exists.

## Trust boundaries

1. **Browser/client:** inspectable and potentially compromised. Never place a permanent gateway/admin secret in the extension.
2. **Control API:** trusted to authenticate the founder and issue scoped grants; all inputs and origins are untrusted.
3. **Gateway:** internet-facing security boundary; authorization, quota and destination restrictions must be server-enforced.
4. **DNS/network:** hostile input; rebinding, multiple answers, IPv4/IPv6 and special-use routes must fail closed.
5. **Destination websites:** external systems; website TLS must remain end-to-end.
6. **Operations host:** holds TLS keys, SQLite data, service configuration and backups; least privilege and firewalling are mandatory.
7. **GitHub/dependency supply chain:** source, CI actions and upstream packages can be compromised; exact pins, review and secret scanning are required.
8. **Cloud provider:** controls host availability, region, metadata services and billing. Provider-level spend controls are distinct from application quota.

See [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md) for threat scenarios and release gates.

## Repository structure

The existing monorepo is sufficient:

```text
apps/
  extension/        Chrome MV3 browser client
  website/          founder operations/help UI
services/
  control-api/      identity, status and grant control plane
  gateway/          authenticated forward-proxy adapter + policy
infrastructure/     runtime config and deployment/firewall examples
scripts/            development, operations, packaging/recovery
tests/              unit, integration, security and browser checks
docs/               architecture, audits, policy and roadmap
```

Do not create speculative packages/directories until a real implementation needs them.

## Current verification boundary

Independent GitHub Actions evidence now covers the implementation line. Run `43647697066` recorded 57/57 passing tests with zero skipped at `91e90c1`, including actual MV3 worker loading on the GitHub runner. Current implementation HEAD `15c8fb9` also passed workflow run `43648138870`, including frozen install, strict TypeScript, tests, build, package, checksum/archive validation, npm audit and whitespace checks. These automated results still do not prove owner-device live proxy routing or a real US exit.

No authorized live US exit, owner Chrome acceptance, public TLS renewal path, production firewall test, DNS/WebRTC/IPv6 leak certification, off-host restore drill, provider billing reconciliation, or full-device VPN exists yet.

## USA-only deployment shape

When the owner supplies an authorized host that passes the $0 cost/terms preflight:

```text
Owner Chrome
  | HTTPS control requests
  +------------------------------> Control API
  |
  | authenticated TLS proxy traffic
  +------------------------------> US Gateway
                                      |
                                      +--> public websites
```

Use a trusted certificate and least-privilege firewall. Caddy `2.11.9` may be introduced only if automatic certificate lifecycle/reverse-proxying makes deployment materially simpler; it is not required merely to add another component.

The exit location is considered US only after provider-region evidence **and** an independent observed exit-IP check agree. A configuration label is not proof.

## DNS/privacy feature phase

Do not install Blocky and AdGuard dnsproxy together by default. When filtering becomes an approved requirement:

- prefer Blocky when the primary requirement is blocklist-based DNS filtering;
- prefer dnsproxy when the primary requirement is encrypted DNS protocol/proxy handling;
- choose a single primary service unless distinct roles are documented.

Browser leak behavior must still be tested independently; adding a DNS daemon does not by itself prove Chrome DNS/WebRTC/IPv6 protection.

## Native full-device VPN architecture

Native clients are a new workstream, not an extension mode. At that phase:

- re-audit and pin WireGuard/wireguard-go or the appropriate platform WireGuard integration;
- use OS networking privileges/tunnel APIs;
- implement platform-specific DNS, kill switch, reconnect/roaming and split tunneling;
- test Windows, macOS, Linux, Android and iOS separately as supported;
- establish signing, update and distribution processes;
- create a native-client threat model and release gates.

Outline Apps, Mullvad and Proton projects may inform architecture only within their licenses. Do not copy GPL code into an incompatible commercial licensing model.

## Scaling path

Only after the single US gateway is reliable and measured:

1. add 1–2 more verified regions through repeatable deployment;
2. add external-user identity/entitlements;
3. introduce operational metrics when multiple services/nodes justify Prometheus;
4. introduce Trivy when containers/native images provide meaningful scan coverage;
5. add billing only with owner approval and sustainable unit economics;
6. add advanced capabilities such as filtering, obfuscation or multi-hop behind feature flags after separate security review.

The success metric remains reliability, security and maintainability—not repository count or generated code volume.

## Repository visibility note

GitHub currently reports the repository as **public**. That does not grant third parties a license, but it increases secret/exposure risk and conflicts with the stated private-monorepo objective. Repository visibility is an owner/account decision and is not changed automatically by this architecture pass.
