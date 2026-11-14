# Architecture decisions and open questions

**Decision states: Accepted / Proposed / Rejected / Superseded.** Proposals should never be silently treated as an implemented stack.

| ID | Decision | State | Rationale |
| --- | --- | --- | --- |
| ADR-001 | One owner-controlled monorepo | **Accepted** | Simple contributor workflow, modular code ownership |
| ADR-002 | Chrome MV3 browser proxy is first deliverable | **Accepted** | US-first single-founder prototype |
| ADR-003 | Strict $0 incremental pilot budget | **Accepted** | Owner explicit instruction; no paid fallback |
| ADR-004 | Full-device VPN is a separate later architecture | **Accepted** | Browser proxy APIs cannot protect the entire OS |
| ADR-005 | Prefer maintained upstream engines over custom protocol/network engines | **Accepted** | Reduce security risk and wasted implementation effort |
| ADR-006 | WXT vs direct Chrome APIs for MVP | **Superseded by ADR-015/019** | Audit found direct MV3 implementation already small and working |
| ADR-007 | 3proxy as initial gateway | **Superseded by ADR-014/019** | Existing proxy-chain integration better fits dynamic per-grant hooks |
| ADR-008 | TypeScript + small Node API + SQLite | **Accepted via ADR-016** | Narrow founder-only control plane is implemented |
| ADR-009 | Better Auth / shadcn / Playwright / Gitleaks candidate bundle | **Superseded by individual decisions** | Dependencies are selected independently, not as a stack |
| ADR-010 | Later WireGuard-based native clients | **Proposed** | Established protocol implementation; repin/re-audit when native work begins |
| ADR-011 | Project source-license choice | **Open** | No general project LICENSE is granted yet |
| ADR-012 | Free US hosting provider and endpoint | **Open / blocked** | Provider/account/cost/terms preflight is missing |
| ADR-013 | Active-session/grant revocation semantics | **Accepted / implemented locally** | Active gateway sockets are terminated on revocation/expiry |
| ADR-014 | `proxy-chain@3.0.3` + `ipaddr.js@2.3.0` for MVP data plane | **Accepted** | Mature forwarding plus thin project policy hooks |
| ADR-015 | Project-owned direct TypeScript MV3 adapter over official Chrome APIs | **Accepted** | Avoid unnecessary framework migration |
| ADR-016 | Single-founder built-in Node SQLite + scrypt auth | **Accepted for MVP** | No public signup/OAuth/email/SMS requirement |
| ADR-017 | Persistent lifetime founder quota + bounded retention | **Accepted** | Cost guardrail and bounded state |
| ADR-018 | Browser-proxy release boundary; no full-device/no-logs/kill-switch claims | **Accepted** | Prevent misleading security claims |
| ADR-019 | Do not rewrite working MVP modules without demonstrated defect or lower total maintenance cost | **Accepted 2026-11-15** | Core credit-saving rule after repository audit |
| ADR-020 | Keep Playwright `1.65.0` pinned until a relevant upgrade reason exists | **Accepted 2026-11-15** | Upstream `1.65.1` alone is not sufficient reason for churn |
| ADR-021 | Add Gitleaks `v8.30.1` as the next small security-tooling milestone | **Proposed / next** | Public repository and credential-sensitive project justify a repeatable secret scan |
| ADR-022 | Better Auth deferred until external-user identity complexity exists | **Accepted 2026-11-15** | Founder-only auth is narrower; framework adds attack/maintenance surface now |
| ADR-023 | Blocky and dnsproxy are alternatives by default, not a combined DNS stack | **Accepted 2026-11-15** | Choose filtering vs encrypted-DNS proxy based on actual requirement |
| ADR-024 | Repository visibility mismatch requires owner decision | **Open** | GitHub reports repository public while target operating model says private monorepo |

## 2026-11-13 — local prototype implementation decisions

- **ADR-014:** `proxy-chain@3.0.3` uses its native HTTPS server and per-request hooks; `ipaddr.js@2.3.0` supports conservative destination classification. Project code supplies dynamic authorization, DNS pinning, quota and revocation. 3proxy remains evaluated, not vendored.
- **ADR-015:** original TypeScript MV3 adapter uses official Chrome APIs directly. No WXT, SuperTunnel, Proton or Windscribe executable source is imported.
- **ADR-016:** one founder, built-in Node SQLite and scrypt; no public signup, OAuth/email/SMS, paid API or authentication framework. Control sessions last approximately one hour; grants approximately five minutes and up to four sockets.
- **ADR-017:** persistent lifetime founder quota, no automatic refill, seven-day expired/revoked grant retention, aggregate usage rather than browsing-history analytics.
- **ADR-018:** loopback development and explicit LOCAL fixture remain distinct from a live US deployment. No global browser kill switch, native protection, no-logs audit or legal compliance is claimed.

## 2026-11-15 — research/architecture pass

The exact required audit set is now:

- [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md)
- [BUILD_VS_REUSE.md](BUILD_VS_REUSE.md)
- [COMPETITOR_FEATURE_MATRIX.md](COMPETITOR_FEATURE_MATRIX.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [LICENSE_AND_DEPENDENCY_AUDIT.md](LICENSE_AND_DEPENDENCY_AUDIT.md)
- [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md)
- [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)

The audit confirmed that framework churn is not the next milestone. First revalidate the latest feature HEAD, then add the smallest justified security tooling.

## How to record decisions

For new decisions record the date, owner, options evaluated, direct upstream source/license/version, security/cost tradeoffs, tests actually run, and a reversal path. Prefer one decision change per focused PR.

## Avoid unapproved assumptions

No automatic paid hosting, public users, charging customers, full no-logs claims, vendor API spending, telemetry collection, domain purchases, proprietary competitor code copying, or “all features now” rewrites.

Reversal principle: keep stable public contracts and replace one adapter/service at a time behind tests. No upstream whole repository is merged merely to obtain a feature list.
