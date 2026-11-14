# Changelog

This changelog records verified repository changes and architecture decisions. It does not treat planned work as shipped functionality.

## Unreleased — 2026-11-15 research and architecture pass

### Added

- Pinned Gitleaks `v8.30.1` CLI integration for full Git-history secret scanning in CI; the Linux x64 archive is verified against upstream SHA-256 before execution. No Gitleaks Action or npm/runtime dependency is added.
- `docs/REPOSITORY_AUDIT.md` — current repository/branch/upstream audit.
- `docs/COMPETITOR_FEATURE_MATRIX.md` — current NordVPN, Proton VPN and ExpressVPN planning benchmark.
- `docs/LICENSE_AND_DEPENDENCY_AUDIT.md` — exact dependency/license/commercial-use inventory.
- `docs/SECURITY_THREAT_MODEL.md` — explicit assets, trust boundaries, threats and release blockers.
- `docs/IMPLEMENTATION_ROADMAP.md` — credit-saving verified milestone sequence.

### Changed

- `docs/BUILD_VS_REUSE.md` now reflects selected implementation rather than provisional WXT/3proxy choices.
- `docs/ARCHITECTURE.md` now documents the actual direct-MV3 + Node/SQLite + proxy-chain architecture and native-VPN boundary.
- `docs/DECISIONS.md`, `docs/PROJECT_STATUS.md`, `docs/HANDOFF.md` and `README.md` now point to the canonical audit set and current next gate.

### Decisions

- Keep the existing direct TypeScript Chrome MV3 extension; defer WXT until cross-browser/build complexity justifies migration.
- Keep `proxy-chain@3.0.3` and `ipaddr.js@2.3.0` for the browser-proxy MVP.
- Keep Playwright `1.65.0` pinned until a relevant reason justifies upgrading.
- Defer Better Auth/Keycloak until external-user identity requirements exist.
- Select Gitleaks `v8.30.1` as the next small security-tooling milestone.
- Keep Blocky and dnsproxy as later alternatives rather than a default combined DNS stack.
- Preserve the strict browser-proxy vs full-device-VPN distinction.

### Evidence / limitations

- Audited implementation HEAD `15c8fb9` passed GitHub Actions run `43648138870`; the workflow's install, TypeScript, test, build, package, archive/checksum, npm-audit and whitespace steps all succeeded.
- Run `43647697066` at `91e90c1` recorded 57/57 tests passing with zero skipped, including actual MV3 worker loading.
- No runtime source was changed by this architecture pass.
- The Gitleaks workflow change requires a fresh PR #1 run before secret-scan coverage is considered verified.
- No paid cloud resource, live US endpoint, domain, external account or public release was created.
- GitHub reports the repository as public; changing visibility requires an owner/account decision.
