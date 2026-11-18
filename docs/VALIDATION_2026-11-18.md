# Repository audit and hardening validation

The baseline was the clean checkout at `5a33f2d9bb4b5408c35ed628e21a1ef0eff9be84`. Local checks ran with Node 24.22.1, npm 11.9.0, Python 3.12.14 and system Chromium 156 on Debian 13. Active command paths and the frozen package lock were reviewed before executing baseline tests. Managed Chromium policy and TLS verification remained enabled.

## Baseline and final results

| Command or check | Result |
| --- | --- |
| `npm ci --ignore-scripts --cache /tmp/mullvad-vpn-npm-cache` | Passed before changes, installing 19 packages without lifecycle scripts or lockfile changes |
| `env -u CHROMIUM_PATH npm run check` | Baseline 59 passed, 0 failed, 2 skipped. Final 63 passed, 0 failed, 2 skipped. TypeScript, MV3 build and whitespace checks passed. |
| `npm run package`, `sha256sum -c private-route-extension-0.1.0.zip.sha256`, `unzip -tq private-route-extension-0.1.0.zip` | Passed at baseline and after changes |
| Local CLI smoke with trusted TLS | Health, invalid session denial, founder login, empty default gateway directory and logout passed. Temporary test state was removed. |
| `npm audit --cache /tmp/mullvad-vpn-npm-cache` | Registry reported zero known vulnerabilities on both runs |
| `python3 -B -m unittest discover -s tools/tests -v` | Baseline 16 passed. Final 18 passed. |
| `python3 -B tools/extract_upstreams.py --verify-only` | Baseline and final passed. Verified 8,485 regular files and four symlinks across the two preserved trees. |
| `python3 -B tools/catalog_repository.py --project-only` | Authored file catalog refreshed without changing either workspace snapshot |
| `git fsck --no-reflogs --full` and checksum-verified Gitleaks 8.30.1 with first-parent merge diffs | Object integrity passed. Redacted scan passed with one exact, reviewed historical prose exclusion. |

The private extension ZIP SHA-256 is `ca79fc39564cc3d224d6e29a29dcb4070934f4691ec44f25e05e6ca7ac8013ed`. The package change reflects the route-controller fix. Dependencies and archive inputs remained pinned.

## Final test matrix

Listed once by primary suite. TLS and security checks also run within multiple groups.

| Area | Selected | Passed | Failed | Skipped | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| Extension controller and worker | 22 | 22 | 0 | 0 | Authentication scoping, route and policy changes, expiry, restart and restoration |
| Control API, SQLite and cross-session authorization | 8 | 8 | 0 | 0 | Auth, retention, grant policy, API, atomic recovery and logout retry |
| Gateway | 13 | 13 | 0 | 0 | HTTP, CONNECT, real TLS, DNS/IP policy, authorization, quota and lifecycle |
| Cross-component integration | 2 | 2 | 0 | 0 | Real local API, proxy, recovery and logout |
| Chromium popup, route and operations UI | 4 | 2 | 0 | 2 | Popup with simulated runtime and operations with fixture API passed. Managed policy skipped actual MV3 load and authenticated browser routing. |
| Runtime | 9 | 9 | 0 | 0 | Dev and configured service lifecycle, trusted TLS, local fixtures and path checks |
| Encrypted backup and restore | 6 | 6 | 0 | 0 | Integrity, wrong credentials, file permissions, truncation and overwrite protection |
| Packaging | 1 | 1 | 0 | 0 | Deterministic archive, notices and secret exclusion |
| Python source and catalog tooling | 18 | 18 | 0 | 0 | Extraction validation and workspace metadata redaction |
| Native build and runtime | 0 | 0 | 0 | 0 | Unrun. Exact archival source verified separately. |

A separate `node --test --experimental-test-coverage --test-timeout=30000 tests/*/*.test.js` run repeated the final Node totals. Node reported 94.12% line, 83.95% branch and 89.05% function coverage across files instrumented by that run. Those figures exclude browser-process and native code.

## Fix evidence

- **T24 dashboard state.** The Chromium regression reported four active grants where one was expected before the fix. It now checks all supported labels, invalid-state handling, active count and action visibility. The real TLS API test independently verifies exhausted status and denied traffic authorization.
- **T02 route verification.** Browser doubles verify that loss of WebRTC setting control during a route check suppresses verified status, keeps proxy settings in place and preserves explicit restoration.
- **T10 recovery.** A SQLite write fault verifies rollback of password, grant and session updates. Retry invalidates the old authorization and accepts the replacement password. A logout failure similarly rolls back persistent revocation so retry returns the grant IDs needed for live tunnel closure. The separate runtime regression checks that a dangling database link is rejected without creating its target.
- **T14 tooling and CI.** Disposable Git fixtures cover a project-only catalog refresh and redaction of ignored paths, sizes, hashes and link targets in full inventories. Both Action version tags were independently resolved to the commits pinned in CI. Hosted CI was unrun.

No actual browser traffic test under a permitted unpacked-extension policy, live exit, native tunnel, leak testing, public deployment or off-host recovery drill was performed. See the [feature matrix](FEATURE_MATRIX.md) and [recovery record](REPOSITORY_RECOVERY.txt) for remaining prerequisites.

## Acceptance follow-up

The follow-up changes build on `6a22253`. Tests ran with managed Chromium policy in place.

| Check | Result |
| --- | --- |
| `npm run check` | 64 passed, 0 failed, 2 managed-browser skips. TypeScript and the extension build passed. |
| Strict MV3 acceptance on managed Chromium | Expected exit 1. The simulated UI test passed and the two actual extension tests stopped at the policy check. No skips counted as success. |
| Recovery CLI drill | Encrypted handoff between isolated local directories passed. Restored usage, stale password/bearer/grant rejection, fresh login and TLS CONNECT, and source database preservation were verified. |
| Runtime configuration check | Matching shared certificate and key passed. Wrong API name, wrong proxy name and mismatched key were rejected. A reserved exit IP was rejected for live configuration. SQLite remained unopened. |
| `python3 -B -m unittest discover -s tools/tests` | 20 passed, including new Linux host prerequisite tests. |
| `python3 -B tools/check_native_host.py` | Expected nonzero result here. `ip` was available. TUN, effective `CAP_NET_ADMIN` and `wg` were missing. |
| Package and preserved sources | Extension ZIP checksum and integrity passed. Both extracted source trees matched the preserved archives. |
| Pinned upstream Linux CLI | Two clean locked offline builds and nonprivileged version and help checks passed. Debug hashes differed across target directories. [Native build record](NATIVE_LINUX_BUILD.md) |

Actual unpacked-extension routing, off-host retrieval and rollback, native routing and a live gateway remain open. The Git push dry run to the named repository returned HTTP 403. No hosting or public service was provisioned.
