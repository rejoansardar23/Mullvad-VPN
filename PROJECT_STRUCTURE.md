# Project structure and functional ownership

Prepared on 17 November 2026. This repository is an independent VPN/privacy project with possible future AI-assisted tooling, as described in [PROJECT_IDEA.txt](PROJECT_IDEA.txt). It does not currently contain an AI model, training pipeline or deployed full-device VPN. Directories reflect implemented responsibilities rather than speculative future services or file extensions.

## Functional map

```text
Mullvad-VPN/
├── README.md                     Current entry point and workflow
├── PROJECT_HANDOFF.md           Implemented capabilities and task backlog
├── PROJECT_IDEA.txt              Detailed product vision and staged feasibility
├── PROJECT_STRUCTURE.md          This organization guide
├── AGENTS.md                     Current owner/agent operating instructions
├── CONTRIBUTING.md               Contribution and delivery rules
├── SECURITY.md                   Private reporting and account-recovery boundaries
├── package.json                  Root Node command/dependency interface
├── package-lock.json             Exact npm dependency graph and integrity pins
├── tsconfig.json                 Shared browser/control-API TypeScript policy
├── .node-version / .npmrc         Pinned Node and npm installation policy
├── .gitignore / .editorconfig     Generated/private exclusions and editor rules
├── .gitleaksignore                Exact reviewed historical prose finding only
├── .github/
│   ├── ISSUE_TEMPLATE/           Bug and feature intake
│   └── workflows/verify.yml      Manual verification workflow; no auto test run
├── apps/
│   ├── extension/                Chrome MV3 browser-proxy client
│   └── operations/               Private founder help/operations UI
├── services/
│   ├── control-api/              Accounts, sessions, grants and operations assets
│   └── gateway/                  Authenticated TLS forward proxy and IP policy
├── infrastructure/               Configured runtime and unapplied host examples
├── scripts/
│   ├── README.md                 Development/recovery/packaging instructions
│   ├── development/dev.mjs      Loopback initialization and development services
│   ├── recovery/backup.mjs       Authenticated encrypted SQLite backup/restore
│   └── packaging/package.mjs    Private extension archive and license notices
├── tests/
│   ├── control-api/              Authentication, persistence and retention cases
│   ├── extension/                Controller, popup, worker and browser routing
│   ├── gateway/                  Proxy transport, DNS/IP, quota and revocation
│   ├── integration/              Cross-component API/proxy/recovery scenarios
│   ├── operations/               Recovery, packaging, dashboard and authorization
│   ├── runtime/                  Development/configured service lifecycle cases
│   └── helpers/                  Shared isolated TLS fixtures
├── tools/
│   ├── extract_upstreams.py      Offline preserved-source recreation utility
│   ├── catalog_repository.py     Static functional/workspace inventory collection
│   ├── tests/                    Python extractor regression suite
│   └── .gitignore                Python cache exclusion
├── upstream/
│   ├── README.txt                Provenance, checksums and licensing boundaries
│   └── archives/                 Original Mullvad and Amnezia application ZIPs
├── docs/
│   ├── ARCHITECTURE.md            Current control/data-plane responsibilities
│   ├── LOCAL_DEVELOPMENT.md       Loopback services, local trust and installation
│   ├── DEPLOYMENT.md              Authorized-host and live-release prerequisites
│   ├── COST_POLICY.md             Current zero-additional-spend constraint
│   ├── SECURITY_AND_PRIVACY.md    Protection boundaries and release requirements
│   ├── LICENSING.md               Project/native/dependency license boundaries
│   ├── LICENSE_AND_DEPENDENCY_AUDIT.md
│   ├── FEATURE_MATRIX.md         Current platform capabilities and evidence
│   ├── STATUS.md                  Current evidence, deferred checks and next work
│   ├── TESTING.md                 Commands for later authorized validation
│   ├── VALIDATION_2026-11-17.md    Post-restructuring baseline
│   ├── VALIDATION_2026-11-18.md    Current audit and hardening verification
│   ├── REPOSITORY_RECOVERY.txt    Scope, preservation evidence and recovery limits
│   └── repository/                Detailed authored/upstream/workspace catalogs
└── AnalyseFuture/
    ├── README.txt                Historical-material handling and interpretation
    ├── PRESERVATION_MANIFEST.json Every baseline tracked file and preserved copy
    ├── previous-root/            Original root documents, catalogs and goal input
    ├── previous-docs/            Complete prior documentation/research tree
    ├── previous-github/          Previous PR template and Word-archive workflow
    ├── previous-tooling/         Original changed extractor/workflow contents
    ├── previous-code/            Exact originals before path/command changes
    ├── before-validation-c7b2977/ Originals before authorized validation fixes
    └── before-handoff-86792c2/   Originals before the implementation handoff
```

## Every authored component has a defined role

The extension's `core.ts` owns validation and connection-state behavior; `worker.ts` owns Chrome service-worker lifecycle and authentication events; `popup.ts`, `popup.html` and `popup.css` own the connection UI. `manifest.json` declares Chrome permissions and entry points. `build.js` creates ignored browser-compatible assets; its location stays next to those entry points. Its README explains the browser-only protection scope.

The private operations UI consists of `index.html`, `app.js` and `style.css`. These belong together under `apps/operations/`, because they manage an existing founder account rather than provide a public marketing website. `services/control-api/server.ts` serves their explicit asset allowlist. That server owns HTTPS API routes, CORS and grant endpoints; `store.ts` owns SQLite identity, sessions, grants and aggregate usage; `cli.ts` owns operator account creation/recovery.

The gateway's `index.js` adapts `proxy-chain` to authorization, metering and revocation. `policy.js` owns public-destination classification and checked DNS selection. Keeping the policy next to the transport makes the network boundary explicit.

`infrastructure/serve.mjs` assembles a configured runtime. Its JSON example contains placeholders and unconfirmed preflight values. The service-unit and firewall examples are host-operational assets, not provisioning proofs or application source. Their README states the deployment prerequisites.

Development, recovery and packaging scripts share only their developer/operator context. Separate functional subfolders make their side effects visible. The root npm commands still provide the main interface; callers normally use `npm run dev:init`, `npm run dev`, `npm run backup` and `npm run package` rather than memorize script paths.

The Node suites are grouped by the behavior they exercise. `tests/helpers/tls.js` remains shared infrastructure. Tests and fixtures are preserved, not rewritten to change assertions. Their relative imports and fixture URLs were adjusted for the moves. The root test command now selects `tests/*/*.test.js`. Python tests stay next to the Python source-management tool they exercise.

## Dependencies and path relationships

```text
apps/extension/{popup,worker}.ts -> apps/extension/core.ts -> Chrome/HTTPS APIs
services/control-api/server.ts -> store.ts + apps/operations/*
services/gateway/index.js -> policy.js + proxy-chain + ipaddr.js
scripts/development/dev.mjs -> control-api + gateway + root .local/
scripts/packaging/package.mjs -> root manifest/lockfile + dist/ + node_modules/
scripts/recovery/backup.mjs -> Node crypto/SQLite + explicit operator file paths
infrastructure/serve.mjs -> control-api + gateway + extension schema validation
tests/<component>/ -> active component modules + tests/helpers/tls.js
tools/extract_upstreams.py -> upstream/archives/*.zip -> build/upstream/
```

Relative imports, static asset URLs, package commands, active documentation and the manual workflow were updated together. The package lockfile and actual dependency versions were preserved. Historical source copies keep original paths in their text for provenance; they are not live execution references.

## Deeply nested third-party and generated material

The native archives contain their own functional project trees: platform applications, daemon/networking components, assets, packaging, build configuration and tests. Their complete internal hierarchy is preserved. Moving their individual C++/Rust/Swift/Kotlin files into our folders would break upstream build references, obscure provenance and mix licensing boundaries. Their proper collection is `upstream/archives/`; extracted equivalents remain `build/upstream/{mullvad,amnezia}/`.

Every archive entry is listed in [UPSTREAM_CATALOG.jsonl](docs/repository/UPSTREAM_CATALOG.jsonl), with functional module classification and bounded static dependency information. [UPSTREAM_SUMMARY.txt](docs/repository/UPSTREAM_SUMMARY.txt) explains the coverage and limitations. This is an inventory and source-navigation aid, not a security certification of every native code path.

Ignored/generated directories are accounted for separately:

| Location | Functional purpose and handling |
| --- | --- |
| `node_modules/` | Installed dependency artifacts resolved by the lockfile; keep package-internal layouts intact |
| `build/upstream/` | Recreated native source trees; do not put unique new work only here |
| `build/initial-extraction-*/` | Earlier local extraction snapshots retained without deletion; redundant generated copies |
| `dist/` | Built extension variants, package, checksum and notices; generated from tracked source |
| `.local/` | Private development identity, TLS key/certificate, database and configuration; preserved in place and excluded from Git |
| `tools/**/__pycache__/` | Python interpreter bytecode caches; generated and ignored |
| `.git/` | Git history/index/remotes/object metadata; preserved as Git internals, never reorganized as app content |

The committed workspace catalog is a historical snapshot. New full refreshes group ignored entries and redact their paths and contents. Git metadata is explicitly outside application categorization. Ignored dependencies and credentials are not committed merely to make the repository look complete. No existing unique source was intentionally hidden in generated output.

## Preservation and uncertain material

`AnalyseFuture/` preserves all earlier planning documents and original versions of anything replaced or adapted. The baseline ledger records all 99 files tracked at commit `4655d408bab907b48e176d7641c6bed55204d7dc`, their hashes and exact retained destinations. Every baseline file must remain byte-identical at one of those destinations at this restructuring commit.

Historical documents are classified by what they do: previous product direction, research, evidence, prompts, source plans and obsolete automation. They are retained rather than called malicious or deleted. The earlier incomplete goal text and Word research archive remain readable. Archived agent instructions use an inert filename so they cannot override current guidance.

## Detailed catalogs

| Record | Coverage |
| --- | --- |
| [FILE_CATALOG.json](docs/repository/FILE_CATALOG.json) | Every resulting tracked/project file, functional purpose, literal source/asset dependencies, npm commands and locked package relationships |
| [UPSTREAM_CATALOG.jsonl](docs/repository/UPSTREAM_CATALOG.jsonl) | All 12,017 native archive entries, nested modules, content identities and bounded static dependency clues |
| [WORKSPACE_INVENTORY.tsv](docs/repository/WORKSPACE_INVENTORY.tsv) | All workspace filesystem entries except protected Git internals; ignored/generated/dependency areas included, private runtime entries redacted |
| [WORKSPACE_SUMMARY.txt](docs/repository/WORKSPACE_SUMMARY.txt) | Snapshot counts, traversal coverage and handling limits |
| [PRESERVATION_MANIFEST.json](AnalyseFuture/PRESERVATION_MANIFEST.json) | Exact retained copy of every pre-restructuring tracked file |

`python3 -B tools/catalog_repository.py --project-only` refreshes only the authored file catalog. Omit `--project-only` to also generate a redacted workspace snapshot. Collection is static. It does not execute applications, import their modules, build artifacts or run tests. These catalogs are navigation/preservation evidence; lexical references are not a fully resolved dependency graph or proof of safe behavior. Catalog files omit self-hashes to avoid recursive identities. Generated filesystem counts describe this machine snapshot and will change in future workspaces.

## Where future work belongs

- Extend an existing component when it owns the behavior. Keep network policy in the gateway and presentation code in its actual UI.
- Add a tracked native component or deliberate licensed fork only after the build/license decision. Preserve upstream provenance; do not develop a unique product only in ignored sources.
- Put a future AI helper with the product or service it actually supports. Do not create empty model/training/agent directories without an implemented requirement, privacy model and authorization.
- Keep active operational documents in `docs/`, current product direction in `PROJECT_IDEA.txt` and superseded originals in `AnalyseFuture/`.
- Keep private state outside Git. Preserve additional local work before regenerating or moving any generated tree.

## Validation boundary

The restructuring commit was delivered without final execution tests, as requested at that time. The owner subsequently re-enabled testing on 17 November 2026. The [baseline](docs/VALIDATION_2026-11-17.md) and [latest validation](docs/VALIDATION_2026-11-18.md) record local execution evidence. Two actual-extension cases are skipped under managed browser policy. Native vendor builds, live US routing and owner-device acceptance remain unverified. CI remains manually triggered.
