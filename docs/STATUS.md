# Current project status

Updated: 18 November 2026. Current instructions are README.md, PROJECT_HANDOFF.md, PROJECT_IDEA.txt, PROJECT_STRUCTURE.md and AGENTS.md. Earlier snapshots and research are preserved in AnalyseFuture/.

## Latest task: browser, recovery and deployment acceptance work

- The strict MV3 acceptance command fails when a runner's policy blocks unpacked extensions. Managed Chromium still blocks the two real-extension checks. [Browser acceptance](../apps/extension/README.md)
- The recovery drill uses the existing CLIs and an encrypted archive copied between isolated local directories. Restored usage and fresh credentials worked, old credentials were denied, and the source database remained byte-identical. An authorized off-host drill and deployed rollback remain open. [Recovery drill](../scripts/README.md)
- The upstream Linux CLI built twice from clean targets with the pinned Rust and Protobuf toolchain. Version and help output matched. Debug binary hashes differed across target paths. This machine lacks TUN access, effective network administration capability and `wg`. [Build record](NATIVE_LINUX_BUILD.md)
- The offline gateway check validates the shared TLS identity and runtime configuration. An approved host and external TLS, firewall, location and billing evidence remain prerequisites to live acceptance. [Deployment preflight](DEPLOYMENT.md)

Local verification finished with 64 Node tests passed and two managed-browser skips, 20 Python tests passed, and successful extension packaging and archive checks. [Follow-up validation](VALIDATION_2026-11-18.md#acceptance-follow-up)

## Prior task: repository audit and hardening

Revalidated baseline `5a33f2d` and confirmed its functional layout. Fixed the operations grant display (T24), WebRTC verification after policy changes (T02), transactional founder recovery and session revocation (T10), and dangling runtime database links. Pinned the manual workflow actions to their existing release commits and added a project-only catalog refresh for review (T14). The [feature matrix](FEATURE_MATRIX.md) records scope and evidence, including the static native build investigation (T03).

See the [validation results](VALIDATION_2026-11-18.md) and [recovery record](REPOSITORY_RECOVERY.txt) for test counts, repository evidence and account-owner actions. No tracked files moved or were removed. Final local verification recorded 63 passed Node tests, two managed-browser skips and 18 passed Python tests. Native prerequisites, live proxy acceptance and account access review remain open.

## Prior task: implementation handoff and PR continuation

Added root [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md), linked prominently from the repository homepage. It inventories implemented browser-proxy capabilities and their evidence/limits, explains every active project file and folder plus individual historical files, and links the exhaustive third-party/native catalogs. It defines 24 task packets with dependencies, owner prerequisites, implementation scope and acceptance evidence, including the native, browser, deployment, recovery, release and later customer-platform tracks.

The owner requested that subsequent implementation tools create pull requests for review. AGENTS.md, CONTRIBUTING.md, README.md and PROJECT_IDEA.txt now reflect one bounded task per branch/PR, with no automatic merge. This handoff-documentation delivery retains the prior direct-main instruction. Exact pre-change documents are preserved with hashes in `AnalyseFuture/before-handoff-86792c2/`. Static inventories are refreshed for the final file set. The restored instance lacks the prior generated `build/initial-extraction-4t_gtg6r/` copy and some empty/cache directories, so the workspace snapshot has fewer rows; no tracked application or archive files were removed.

Documentation validation: local Markdown paths/anchors, complete project-file link coverage, unique task IDs, workflow consistency, preserved-byte hashes, catalog coverage and whitespace passed for this task (167 project-file links and 24 unique task IDs). The handoff made no runtime changes. Its T24 finding is addressed by the audit above.

PR monitoring is a review workflow in this conversation when the owner supplies a PR/link or requests review. No background watcher, webhook or scheduled monitor has been configured. Git transport read access works; the GitHub API returned `Forbidden` in this environment, so posting a GitHub review is not established by local Git access.

## Previous task: validation authorized and executed

The owner re-enabled testing on 17 November 2026. The reorganized layout was exercised and a real startup-cleanup bug was corrected. The final local Node suite has **59 passed, 0 failed and 2 managed-browser skips** out of 61 tests; the Python suite has **16 passed**. Build, packaging, trusted-TLS CLI smoke, frozen install, registry advisory report, source restoration and preservation checks passed. Full-history Gitleaks passed with one documented exact historical prose exception.

See [the detailed validation report](VALIDATION_2026-11-17.md) for commands, the failing-before/passing-after port-conflict regressions, artifact identity and remaining limits. CI remains manual; no GitHub-hosted run is claimed. The latest authorization supersedes the temporary no-tests restriction described below.

## Preserved restructuring record

Reorganize the complete repository by functional responsibility, preserve existing work, provide a detailed product idea, document every collection and push directly to main. The baseline is commit `4655d408bab907b48e176d7641c6bed55204d7dc`.

The source tree separates browser client, private operations UI, control API, gateway, development/recovery/packaging tools, component tests, original native archives and current guidance. Historical documents, obsolete automation and exact pre-change source copies are retained under AnalyseFuture/. The preservation ledger accounts for every baseline tracked file.

## Existing capabilities

The repository already contains a Chrome MV3 browser-proxy client, founder HTTPS API/SQLite state, authenticated TLS forward proxy, grant/usage/destination controls, operations UI, encrypted recovery and private packaging tools. Original Mullvad and Amnezia archives and the offline recreation tool are preserved. These are implemented assets, not proof of a deployed VPN company.

## Evidence and deferred checks

- Static review covers functional placement, source import/asset/command references, archive metadata, provenance and preservation of baseline file bytes.
- At restructuring delivery, the catalog contained 147 project files and 25,404 workspace entries. Catalogs are refreshed after subsequent tasks; the native catalog covers all 12,017 archive entries. Private runtime entries are redacted and Git internals are protected.
- All 99 baseline tracked files have byte-identical retained destinations. Static review found no unresolved literal module/asset or active Markdown paths. Both generated native source copies match preserved archive file content; no unique source edit was discovered there.
- At restructuring delivery, execution checks were deferred under the then-current owner instruction. The subsequent authorized validation and its remaining limits are recorded above.
- Earlier in the session, before that instruction and the final deeper moves, the then-current layout had 57 Node tests passing and two managed-browser skips, 16 Python tests passing, a built private package and source verification. Those results are historical and do not validate this final layout.
- The manual verification workflow is preserved with updated paths. It remains manually triggered; the current local validation does not claim a GitHub Actions run.
- No native application build, live US endpoint, owner-device leak acceptance, global service, public account platform or store release is established.
- The reported account compromise is not proved or remediated by source inspection. Account access review, revocation and any necessary secret rotation remain account-owner actions.

## Next task

Use the acceptance checks in [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md). The next external prerequisites are a permitted browser runner (T01), an authorized separate recovery environment (T10), and an approved host and endpoint for T06 and T07. The available GitHub identity received HTTP 403 for a write dry run to the named repository. The review commits are local.

No additional spending, new paid service, production deployment or project-license selection is authorized by this reorganization.
