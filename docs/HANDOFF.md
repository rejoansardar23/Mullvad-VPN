# Project handoff and session continuity

Developers and coding agents should be able to resume from GitHub without chat history.

## Canonical handoff artifacts

- [../README.md](../README.md): mission/entry.
- [../TASKS.md](../TASKS.md): single numbered task tracker, statuses, evidence, blockers.
- [PROJECT_STATUS.md](PROJECT_STATUS.md): implemented vs planned.
- [DECISIONS.md](DECISIONS.md): ADRs, open choices.
- [BUILD_VS_REUSE.md](BUILD_VS_REUSE.md): library research/audit.
- [TEST_STRATEGY.md](TEST_STRATEGY.md): proof of function.
- [COST_POLICY.md](COST_POLICY.md): budget guardrail.
- [source-plans/](source-plans/): preserved original dated plan.

## At the end of each session

Update TASKS and PROJECT_STATUS with the actual implemented feature and evidence. Commit small changes. Record:
1. What changed (paths and commit/PR).
2. Commands/tests run and precise results, not just "looks good".
3. Current task ID and status; any blocker with responsible owner.
4. Any cost or new third-party dependency and how verified.
5. Known security/privacy issues and unfinished checks.
6. Exact next task and one or two runnable next commands when code exists.

## Secrets and account safety

Never include account login emails, billing information, provider authentication tokens, recovery codes, or private server addresses/keys in public docs. Use authorized secret storage, minimal repository access, and owner-controlled account verification. Do not ask the owner to paste secrets into chat.

## New coder / Codex kickoff

"Read README.md, AGENTS.md, TASKS.md, docs/START_HERE.md, docs/PROJECT_STATUS.md, docs/ARCHITECTURE.md, docs/SECURITY_AND_PRIVACY.md, docs/BUILD_VS_REUSE.md, docs/DECISIONS.md, and docs/COST_POLICY.md. Identify the earliest unblocked task. Audit dependencies before coding. Build the smallest tested deliverable, report actual evidence, update docs, and commit. Never spend money or misrepresent mock results."


## Current implementation handoff — 2026-11-13

Source areas: TypeScript control API and MV3 extension, established TLS proxy adapter, private operations/help, SQLite recovery, private development/runtime tooling, pinned dependencies and integration/security tests. Current acceptance result: 56 automated checks passed, actual MV3-load check skipped because managed Chromium blocks unpacked extensions; see VALIDATION.md for all boundaries. Source originally started at `476a928`. Implementation commit `3843d3e` was pushed to `feat/tested-private-browser-proxy` and independently cloned, installed and tested; no change was pushed to `main`. Final documentation records that clean-checkout evidence.

Run `npm ci --ignore-scripts` and `npm run check`, then `npm run package`. For local services run `npm run dev:init` followed by `npm run dev -- --fixture`; stop with Ctrl+C. No US host or live owner Chrome verification is available. No paid resource or public deployment was created. Original project license remains undecided; upstream audit and all locked dependency licenses are documented.

Next action is the Task03 owner-host preflight and Tasks10–15 actual Chrome/traffic acceptance. Do not claim the whole VPN project complete or mark Tasks14/19/20 Done from the local package. Native clients and public business features remain deferred.

## Current review handoff — 2026-11-15

**Review PR:** [#1 — tested browser-proxy prototype](https://github.com/rejoansardar23/vpn/pull/1) (open; do not merge automatically). **Source branch:** `feat/tested-private-browser-proxy` targeting `main`. Do not force-push or merge without explicit review/authorization. The original existing implementation, architecture, licensing policy, and zero-additional-spend constraint were preserved. Existing project artifacts and source remain authoritative, not chat history.

**Code/CI changes made during independent review:**

1. `.github/workflows/verify.yml`: public-repo standard GitHub-hosted Ubuntu CI, Node 24.22.1, frozen install, strict TypeScript check, real Playwright Chromium (including MV3 worker), whole test suite, build, private ZIP and checksum/integrity verification, npm advisory audit, whitespace check. `contents: read`, no write token retained in checkout, no secrets, deployment, billable runners or publishing. CI uses maintained versions of GitHub's checkout/setup-node actions. No new runtime dependency.
2. `.npmrc`: removed hard-coded `/workspace/.npm-cache` after initial CI failed with `EACCES` on the GitHub runner.
3. `services/gateway/policy.js` and `tests/gateway.test.js`: explicit IPv4/IPv6 special-use CIDR denial, including IPv4-mapped forms and mixed DNS response checks, with existing valid public addresses still allowed.
4. `TASKS.md`, `docs/PROJECT_STATUS.md`, `docs/VALIDATION.md`, and this handoff: separated fully reproduced current CI evidence from older cloud-task results, unverified behavior and release gates.

**Reproducible evidence:** [GitHub Actions run 43647697066](https://github.com/rejoansardar23/vpn/actions/runs/43647697066), tested source commit `91e90c1d`: `npm ci --ignore-scripts`, `npm run typecheck`, `npm test` (57/57 pass, **zero skipped** including actual MV3 worker load), `npm run build`, `npm run package`, SHA-256 and ZIP integrity, `npm audit` (zero reported advisories) and `git diff --check` all passed. Earlier failure: [run 43647644278](https://github.com/rejoansardar23/vpn/actions/runs/43647644278) blocked on npm cache permissions and is fixed. For the latest documentation/workflow commit and eventual PR, inspect its newest CI result; do not claim a pending or skipped check passed.

**Outstanding security/release concerns:** authenticate and verify real owner Chrome challenges, destination DNS/WebRTC/IPv6 privacy and browser fail-open paths, revocation/expiry and quotas under outages/restarts; audit special-use IP policy and host egress firewall against hosting provider network; independently validate public TLS renewal, production abuse controls, provider hard quotas/billing and application counter overhead; evaluate secret scanning, aggregate data retention, off-host recovery and rollback. Do not claim independently certified security, no-logs, full-device VPN, global kill switch, or live US exit. The project-wide license remains unapproved for commercial distribution.

**Next priority:** finish Tasks 10–15 in the owner's real Chrome against a securely authorized US exit **only after** Task 03 provider terms/region/actual $0 cost can be verified. In parallel, improve the automated real-browser proxy-auth/Connect/Disconnect network scenario using controlled local origins without weakening managed browser policy. Release still blocked by Tasks 03, 14, 15, 19 and 20; later native/commercial phases deferred. Cost change: **$0 additional spending**. Run `npm ci --ignore-scripts && npm run check && npm run package && npm audit` on Node 24.22.1, or inspect the repository's GitHub Actions checks, before any merge.


## Open-source reuse audit handoff — 2026-11-15

Before adding an advanced component, read the seven-document gate: [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md), [BUILD_VS_REUSE.md](BUILD_VS_REUSE.md), [COMPETITOR_FEATURE_MATRIX.md](COMPETITOR_FEATURE_MATRIX.md), [ARCHITECTURE.md](ARCHITECTURE.md), [LICENSE_AND_DEPENDENCY_AUDIT.md](LICENSE_AND_DEPENDENCY_AUDIT.md), [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md), and [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md).

Architecture decision: keep the working direct-MV3 extension and current proxy-chain/ipaddr gateway; do not migrate to WXT/3proxy/Better Auth/Keycloak/shadcn without a demonstrated requirement or lower total maintenance cost. Current implementation HEAD `15c8fb9` passed workflow run `43648138870`. The next smallest selected tooling milestone is Gitleaks `v8.30.1`; owner-browser/live-US acceptance remains a distinct release gate.
