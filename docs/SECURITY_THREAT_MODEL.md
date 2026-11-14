# Security threat model — browser-proxy MVP

Status: architecture baseline for the founder-only USA browser-proxy milestone. It complements `SECURITY_AND_PRIVACY.md` with explicit assets, trust boundaries, threat scenarios, mitigations and release gates.

## Protected assets

- Founder account password and recovery process.
- Control-plane bearer sessions.
- Short-lived proxy grant credentials.
- Gateway TLS private key and public certificate lifecycle.
- SQLite account/session/grant/usage state.
- Browser proxy configuration and previous owner-controlled settings.
- Gateway availability, bandwidth quota and cloud billing exposure.
- Backup material and recovery passwords.
- Product integrity: source, lockfile, release archive and CI workflow.

## Trust boundaries

1. **Browser extension** — inspectable/untrusted client environment.
2. **Control API** — authenticates founder and issues/revokes grants.
3. **Gateway** — internet-facing data plane that must never become an open proxy.
4. **DNS resolution / destination network** — untrusted input that can be used for SSRF/rebinding.
5. **Destination websites** — external systems; their TLS must remain end-to-end.
6. **Operations host** — private keys, SQLite database, firewall, service manager and backups.
7. **GitHub / dependency supply chain** — public source, CI actions, npm packages and upstream releases.
8. **Cloud provider** — billing, metadata network, public IP, region and abuse controls.

## Threats and required controls

| Threat | Impact | Current controls | Remaining release evidence |
| --- | --- | --- | --- |
| Stolen founder password | Account takeover, proxy abuse | scrypt password hash, closed signup, rate limit, recovery revokes sessions/grants | MFA is deferred; owner credential handling must be operationally reviewed |
| Stolen bearer token | Grant issuance/revocation | Random 32-byte token, hash at rest, 1-hour expiry, no-store responses, session invalidation | Browser/device compromise remains outside service control |
| Stolen proxy grant | Temporary bandwidth abuse | Random secret, hash at rest, 5-minute expiry, one active founder grant, max 4 sockets, quota, active revocation | Validate actual proxy challenge behavior in owner Chrome |
| Wrong-origin proxy auth challenge | Credential leak to website/other proxy | Extension requires `isProxy`, exact host+port and Basic scheme | Real Chrome event verification required |
| Open-proxy exposure | Abuse, liability, cost | Authentication required, no anonymous path, grant expiry/revocation, socket cap | Public host penetration/abuse tests before deployment |
| SSRF to host/private/cloud metadata | Host/cloud compromise | Public-only IP policy, special-use denial, DNS-answer validation and pinning, only ports 80/443 | Apply and verify host firewall in production |
| DNS rebinding | Bypass destination policy | All answers checked; one checked address pinned into forwarding lookup | Owner/public resolver behavior and IPv6 deployment tests |
| TLS MITM on browser-to-proxy/control API | Credential/traffic exposure | TLS 1.2+ listeners; clients must validate trust; no disabled verification | Public certificate/renewal path and owner-browser trust test |
| Website TLS interception | Privacy/security break | Gateway performs CONNECT forwarding; no destination TLS interception | Continue tests asserting target certificate validation |
| Proxy failure causes direct browsing | IP leak | Extension does not intentionally choose direct fallback; error keeps proxy settings in place | Browser-global fail-closed semantics must be tested; never call it an OS kill switch |
| DNS/WebRTC/IPv6 leak | Real IP/DNS exposure | WebRTC non-proxied UDP mitigation; proxy routing/destination rules | Dedicated owner-browser leak tests are still mandatory |
| Competing browser policy/extension | Routing bypass | Verify `levelOfControl`; refuse when not controlled; detect changed settings | Test on owner Chrome with common policy/conflict cases |
| Service-worker restart/state loss | Incorrect status/auth | session/local storage recovery, alarms and route verification | Real MV3 lifecycle test on unmanaged Chrome |
| Quota bypass / cost runaway | Unexpected bill | lifetime application quota, durable accounting, connection limits | Provider-level hard limits and billing review; app bytes are not provider billing bytes |
| Log/privacy overcollection | Trust/privacy harm | aggregate usage only, no browsing-history feature | Production host/access logs and retention policy review |
| Backup theft/tampering | Account takeover/state loss | encrypted backup and tamper/wrong-password tests | Off-host storage and restore drill |
| Dependency compromise | Code execution/supply chain | exact lockfile, integrity hashes, `npm audit`, selective dependencies | Add pinned Gitleaks; consider Trivy only when scope warrants |
| Secret committed to public repo | Immediate credential/key exposure | ignore rules, packaging allowlist, limited pattern checks | Full Gitleaks scan and repository-visibility decision |
| Misleading “VPN” claims | Consumer/security harm | docs repeatedly state browser proxy != full-device VPN | Preserve wording in UI/site/store materials |
| Malicious/compromised US host | Traffic metadata exposure | no live host yet; destination TLS remains end-to-end | Provider/host hardening, minimal logs, update policy, incident plan |

## Abuse and failure policy

The gateway must fail closed for authorization, destination policy, quota persistence and revocation. If the gateway cannot persist usage or verify a grant, it must terminate/deny the connection rather than continue unmetered.

The browser extension may not be able to guarantee a universal browser or OS kill switch. When its protection boundary cannot be proven, the product must narrow the claim instead of simulating protection.

## Supply-chain policy

- Runtime dependencies require exact version, upstream repository, license and lockfile integrity.
- GitHub Actions must be pinned/reviewed; no secrets are exposed to untrusted pull requests.
- No remote executable code in the extension.
- No dependency is added solely because a competitor uses a similar feature.
- Security tools do not replace review: `npm audit`, Gitleaks and Trivy are complementary signals.

## Required security test groups before live release

1. Founder login failure/rate-limit/session-expiry/recovery.
2. Grant issuance, wrong credentials, expiry, active revocation and concurrency.
3. Exact proxy-auth challenge scoping in real Chrome.
4. HTTP and nested HTTPS CONNECT with TLS verification.
5. Private/link-local/metadata/special-use IPv4 and IPv6 denial.
6. DNS rebinding and multiple-answer denial/pinning.
7. Quota exhaustion, restart and persistence-failure behavior.
8. Browser restart, MV3 worker restart, proxy ownership changes and extension conflicts.
9. DNS/WebRTC/IPv6 leak checks on the owner device.
10. Gateway outage, API outage, certificate failure and route-IP mismatch.
11. Host firewall, exposed-port and admin-interface verification.
12. Secret scan, dependency audit, reproducible package hash and clean release checkout.
13. Encrypted backup/restore and deployed rollback drill.
14. Provider bandwidth/billing hard-cap and emergency shutdown verification.

## Release blockers

No public/live release until an authorized US host, trusted public TLS, owner Chrome installation, real route verification, leak/failure acceptance, provider cost controls, secret scan and deployment rollback evidence are documented.
