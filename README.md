# VPN Platform — open-source-first, company-owned VPN project

> **Project status: locally tested browser-proxy prototype; live release blocked.** The repository contains a TypeScript control API and Chrome MV3 extension, SQLite founder account, authenticated TLS forward proxy, private operations/help page, encrypted recovery tools and automated tests. **No authorized US exit host, owner Chrome installation, leak certification or full-device VPN is verified.** Independent GitHub CI now covers the audited implementation head; run `43648138870` passed at `15c8fb9`. Live US deployment and owner-browser acceptance remain blocked.

## Build and test now

Use Node **24.22.1**, npm, OpenSSL, `zip`, and Chromium for browser UI tests. No paid service is required for local development.

```sh
npm ci --ignore-scripts
npm run check
npm run package
npm run dev:init
npm run dev
```

Development services bind only to loopback and use verified TLS. `npm run dev -- --fixture` explicitly advertises a **local test fixture**, never a US exit. Development credentials and the local test certificate stay in ignored `.local/` with private permissions. See [local setup and installation](docs/LOCAL_DEVELOPMENT.md) before signing in. The default advertises no gateway until one is actually configured.

`dist/private-route-extension-0.1.0.zip` is a private installation artifact, not a store release. An owner's unmanaged Chrome installation and real-route acceptance remain required.

## Our mission

Build an **original, trustworthy consumer VPN platform** that can eventually compete with market-leading products such as NordVPN, Proton VPN, and ExpressVPN in usability, privacy, reliability, performance, and breadth of features. The product and brand are independent. We will **not** copy proprietary code, infrastructure, assets, trademarks, or unverified privacy claims.

**Founder-first delivery:** a Chrome Manifest V3 browser-proxy extension for one person with **one verified US exit location**, followed by 1–2 additional countries, then broader geographic coverage and genuine **full-device VPN clients** (desktop/mobile). A browser proxy is not a device-wide VPN.

**Development constraints:** GitHub + Codex Cloud; no local development-tool installation required for the primary build workflow; **$0 additional spending for the private prototype**. Do not provision paid infrastructure, register paid accounts, publish to stores, buy a domain, purchase credits, or add commercial APIs without a new explicit owner decision. Free hosting is a candidate, **not a promise**.

## Mandatory research-before-implementation gate

Before adding or replacing a component:

1. Search maintained open-source options.
2. Compare feature fit, exact version/ref, license/commercial obligations, security history, maintenance, integration cost and testability.
3. Reuse mature components when they are cheaper and safer than custom implementation.
4. Do not duplicate functionality already provided by a selected dependency.
5. Do not combine competing frameworks without a distinct documented need.
6. Keep the smallest working milestone and prove it before expanding scope.

The 2026-11-15 architecture pass concludes that the existing direct Chrome-MV3 extension and `proxy-chain` gateway integration should **not** be rewritten merely to adopt WXT, 3proxy, Better Auth or another framework.

## Required architecture/audit set

These seven documents are the current research gate for new advanced implementation:

| Document | Purpose |
| --- | --- |
| [REPOSITORY_AUDIT.md](docs/REPOSITORY_AUDIT.md) | Actual branch/code inventory, current upstream observations, evidence limits |
| [BUILD_VS_REUSE.md](docs/BUILD_VS_REUSE.md) | Exact selection/defer/reject decisions and test strategy |
| [COMPETITOR_FEATURE_MATRIX.md](docs/COMPETITOR_FEATURE_MATRIX.md) | NordVPN/Proton VPN/ExpressVPN benchmark and staged parity roadmap |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Implemented control/data planes and native-VPN boundary |
| [LICENSE_AND_DEPENDENCY_AUDIT.md](docs/LICENSE_AND_DEPENDENCY_AUDIT.md) | Exact selected versions, licenses and commercial-use obligations |
| [SECURITY_THREAT_MODEL.md](docs/SECURITY_THREAT_MODEL.md) | Assets, trust boundaries, attack scenarios and release blockers |
| [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) | Small verified milestones from revalidation → US pilot → native/global product |

The older [REPO_AUDIT.md](docs/REPO_AUDIT.md) and [DEPENDENCY_LICENSE_MATRIX.md](docs/DEPENDENCY_LICENSE_MATRIX.md) remain detailed evidence sources from the first implementation pass rather than being discarded.

## New here? Start in this order

| Read | What you will learn |
| --- | --- |
| [START_HERE.md](docs/START_HERE.md) | Contributor onboarding |
| [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | What actually exists and what remains unverified |
| [REPOSITORY_AUDIT.md](docs/REPOSITORY_AUDIT.md) | What was inspected before further implementation |
| [BUILD_VS_REUSE.md](docs/BUILD_VS_REUSE.md) | Which open-source components are selected or deferred |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, security boundaries, browser proxy vs VPN |
| [SECURITY_THREAT_MODEL.md](docs/SECURITY_THREAT_MODEL.md) | Security assumptions and release gates |
| [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) | Ordered credit-saving milestones |
| [TASKS.md](TASKS.md) | Original numbered implementation tracker and blockers |
| [COST_POLICY.md](docs/COST_POLICY.md) | Strict zero-additional-cost prototype policy |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute and prove work |
| [AGENTS.md](AGENTS.md) | Operating instructions for coding agents |

**Canonical earlier plan:** [VPN Company Launch Plan (2026-11-12)](docs/source-plans/VPN_Company_Launch_Plan_2026-11-12.md). It remains historical source context; newer audited documents refine implementation choices without weakening the cost/security constraints.

## What is already built

- Project-owned typed Chrome MV3 extension over official Chrome APIs.
- Project-owned Node/TypeScript control API with one founder account.
- Built-in SQLite/scrypt session/grant state.
- `proxy-chain@3.0.3` TLS forward-proxy integration.
- `ipaddr.js@2.3.0` plus explicit IPv4/IPv6 destination restrictions and DNS pinning.
- Short-lived/revocable proxy grants, quotas and connection limits.
- Private operations/help UI, encrypted backup/restore and deterministic packaging.
- Node/Playwright automated tests and a GitHub Actions verification workflow.

Independent CI run `43647697066` recorded 57/57 tests passing with zero skipped at `91e90c1`, including actual MV3 worker loading; current implementation HEAD `15c8fb9` also passed workflow run `43648138870`. These automated checks do not prove live US routing or owner-device leak behavior.

## What we're building next

1. Keep PR #1's **latest commit green in GitHub Actions** after every branch update; current audited implementation HEAD `15c8fb9` passed.
2. Add a **pinned Gitleaks scan** as the smallest next open-source security-tooling milestone.
3. Perform owner-controlled Chrome lifecycle/proxy/auth/leak acceptance.
4. Verify an authorized, genuinely $0-incremental US host before provisioning anything.
5. Deploy one US browser-proxy gateway with trusted TLS and verify the real exit IP.
6. Observe cost, reliability, rollback and privacy behavior before adding countries/features.
7. Move to public users, billing and native WireGuard-based clients only through later gated phases.

**Important:** Working buttons, mocked IP addresses, a `US` label, or server config files are **not** evidence of a live US connection.

## Design and ownership

- **One owner-controlled modular monorepo**; use packages/services from established open-source projects rather than pasting entire repositories together.
- Exact dependency/version/license decisions live in [BUILD_VS_REUSE.md](docs/BUILD_VS_REUSE.md) and [LICENSE_AND_DEPENDENCY_AUDIT.md](docs/LICENSE_AND_DEPENDENCY_AUDIT.md).
- Do not invent a VPN protocol or home-grown encryption scheme.
- **Current GitHub visibility is public.** Do not commit personal details, production credentials, private endpoint credentials, recovery tokens, private keys or billing data. Making the repository private is an owner/account decision.
- Publicly visible code is not automatically freely licensed; project licensing remains an explicit decision in [LICENSING.md](docs/LICENSING.md).

## Repository map

```text
README.md                         Main entry point
AGENTS.md                         Coding-agent rules
TASKS.md                          Original numbered task tracker
CHANGELOG.md                      Verified project/documentation changes
docs/
  REPOSITORY_AUDIT.md             Current repository/upstream audit
  BUILD_VS_REUSE.md               Selected/deferred/rejected components
  COMPETITOR_FEATURE_MATRIX.md    Current product benchmark
  ARCHITECTURE.md                 Current technical architecture
  LICENSE_AND_DEPENDENCY_AUDIT.md Commercial/license inventory
  SECURITY_THREAT_MODEL.md        Explicit threat model
  IMPLEMENTATION_ROADMAP.md       Credit-saving milestone sequence
  PROJECT_STATUS.md               Evidence-based status
  VALIDATION.md                   Executed validation evidence
  COST_POLICY.md                  Zero-extra-spend prototype constraint
  LOCAL_DEVELOPMENT.md            Reproduction/private install
  DECISIONS.md                    ADR history
apps/                             Extension and operations/help UI
services/                         Control API and gateway
infrastructure/                   Runtime/deployment examples
scripts/                          Development/operations/packaging
tests/                            Unit/integration/security/browser tests
.github/                          Workflow and contribution templates
```

## First contribution

Read the audit set first. Choose the earliest **unblocked** milestone/task, make one small verifiable change, run focused tests and the required broad checks for security/networking/lockfile changes, record actual evidence, then submit a reviewable PR.

If a task requires a US server or owner-only browser verification and the prerequisite is unavailable, mark it **Blocked** and continue an independent verified milestone. Do not depend on ChatGPT history to understand the project.
