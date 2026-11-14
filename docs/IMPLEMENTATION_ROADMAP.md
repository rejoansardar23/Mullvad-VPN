# Implementation roadmap — verified milestones, not code volume

This roadmap applies the mandatory research-before-implementation and credit-saving rules. Each milestone is intentionally small and should be one reviewable PR unless a dependency forces a smaller split.

## Current baseline

Already implemented on `feat/tested-private-browser-proxy`:

- Founder-only HTTPS control API and SQLite state.
- Authenticated short-lived proxy grants.
- TLS forward proxy using `proxy-chain@3.0.3`.
- Public-only destination policy using `ipaddr.js@2.3.0`.
- Chrome MV3 extension using official APIs directly.
- Route verification states, WebRTC mitigation and proxy ownership checks.
- Quotas, concurrency, active revocation and retention.
- Private operations/help UI.
- Encrypted backup/restore and deterministic extension packaging.
- Automated Node/Playwright tests and GitHub Actions workflow.

Do **not** rebuild these features merely to adopt a different framework.

## M0 — Research and architecture gate

**Deliverables:** the seven required documents, current upstream/version/license review, competitor benchmark, threat model, architecture decision, and roadmap.

**Exit:** every currently proposed component has an explicit select/defer/reject decision and no advanced implementation starts from an unaudited dependency.

## M1 — Revalidate current feature HEAD — completed for audited baseline

GitHub Actions run `43647697066` recorded 57/57 passing tests with zero skipped at `91e90c1`, including actual MV3 worker loading. After later CI/documentation maintenance, current implementation HEAD `15c8fb9` passed run `43648138870`; frozen install, typecheck, tests, build, package, checksum/archive, npm audit and whitespace steps all completed successfully.

**Exit:** met for the audited implementation baseline. Require the newest PR check again after every subsequent branch change; never extrapolate an older green run to a newer commit.

## M2 — Secret scanning with Gitleaks

**Selected reuse:** `gitleaks/gitleaks@v8.30.1` (MIT), pinned.

Actions:

1. Add a narrow CI scan with no paid service.
2. Scan current tree/history scope appropriate for the repository.
3. Add a small configuration only if a demonstrated false positive requires it.
4. Record exact result; do not claim “no secrets exist,” only that the configured scan passed.

**Exit:** repeatable passing scan on current source.

## M3 — Owner Chrome acceptance

No new framework.

Actions:

1. Package the existing extension.
2. Install on an owner-controlled unmanaged Chrome.
3. Verify real MV3 worker lifecycle, proxy control, exact auth challenge handling, connect/disconnect, previous-setting restoration, restart and policy conflicts.
4. Execute DNS/WebRTC/IPv6 and failure tests.

**Exit:** documented manual/browser evidence. If a browser limitation is found, fix the smallest demonstrated defect.

## M4 — Authorized US host preflight

**Blocked until owner provides/approves a host. No purchase is authorized.**

Verify provider account/terms, US region, public IP cost, egress cost, storage cost, hard spend/bandwidth limits, abuse policy, firewall capability, TLS/DNS path and emergency shutdown.

**Exit:** written evidence that incremental cost is truly $0 for the pilot and the use is allowed. Otherwise remain blocked.

## M5 — Live USA-only browser-proxy deployment

Reuse the current gateway/control-plane implementation. Add Caddy `2.11.9` only if a real hostname/automatic certificate lifecycle makes it materially simpler; otherwise do not add it.

Actions:

- Apply least-privilege service/firewall configuration.
- Use trusted TLS.
- Deploy one gateway.
- Verify observed exit IP from an independent HTTPS endpoint.
- Re-run authentication, revocation, destination denial, quota and leak/failure tests.
- Perform backup/restore and rollback drill.
- Observe provider usage/billing.

**Exit:** reliable one-founder US browser-proxy service with truthful limitations and $0 observed incremental spend.

## M6 — Browser hardening and 1–2 additional countries

Only after M5.

Potential work:

- Location abstraction and deployment automation.
- Firefox/Edge only when browser demand justifies test cost.
- Split routing only with precise UX/security semantics.
- DNS filtering: choose **one primary approach**. Prefer Blocky `0.36.0` for blocklist-oriented filtering; use dnsproxy `0.86.0` instead when encrypted DNS protocol handling is the actual requirement. Do not run both by default.
- UI framework adoption only if the popup/admin surface becomes complex enough to repay the migration cost.

## M7 — External users and commercial account platform

Replace founder-only auth only when public users exist.

Preferred evaluation order:

1. Better Auth latest stable at implementation time, with security-advisory review and exact pin.
2. Keycloak only if enterprise IAM, federation or complex organization policies justify its operational cost.

Add MFA, entitlement/device limits, support, legal/privacy operations and abuse handling before billing. No payment integration before explicit owner approval.

## M8 — Native full-device VPN

Separate product architecture.

- Repin and review `WireGuard/wireguard-go` at implementation time.
- Build platform-specific Windows/macOS/Linux/Android/iOS integrations as justified.
- Implement/test OS kill switch, DNS, roaming/reconnect and split tunneling per OS.
- Add signing/distribution/release processes.
- Use Outline/Mullvad/Proton projects as architecture references only where their licenses permit the intended use.

A browser proxy must never be renamed into this milestone.

## M9 — Multi-region operations and scaling

When real load exists:

- Deployment automation and regional health.
- Capacity and abuse controls.
- Prometheus only when multi-service metrics justify operating it.
- Trivy when container/native artifact scanning provides real coverage.
- Incident response, key rotation, certificate renewal, backup retention and SLOs.

## M10 — Global competitive platform

Only after reliability, privacy, performance and operations are proven:

- Broader country network.
- Multi-hop.
- Obfuscation/censorship resistance.
- Advanced filtering.
- Dedicated IP where commercially justified.
- Independent security/privacy review.
- Performance and uptime benchmarks.
- Customer support and sustainable unit economics.

## PR discipline

Every implementation PR must state:

- task/milestone;
- reused component and exact version;
- why reuse beats custom code;
- license obligations;
- security impact;
- focused tests first;
- full tests required for networking/auth/lockfile changes;
- actual results;
- cost impact;
- unfinished work and rollback path.

Feature flags are required for optional advanced capabilities that can change routing/security behavior. No cloud resource purchase or public launch is authorized by this roadmap.
