# Project validation commands

The owner re-enabled testing on 17 November 2026. These commands exercise the reorganized project; actual outcomes and limitations are recorded in [the validation report](VALIDATION_2026-11-17.md).

From the repository root, use Node 24.22.1, npm, OpenSSL, zip and Chromium. Python 3.12+ is used for source tooling. Preserve TLS, package integrity and artifact checksums.

```sh
npm ci --ignore-scripts
npm run check
npm run package
python3 -B -m unittest discover -s tools/tests -v
python3 tools/extract_upstreams.py
python3 tools/extract_upstreams.py --verify-only
```

`npm run check` performs strict TypeScript checking, the preserved Node suites and the extension build. The Node command selects the component suites under `tests/*/*.test.js`. Focused browser tests now live under `tests/extension/`; recovery, packaging and dashboard checks live under `tests/operations/`. Shared temporary TLS fixtures remain in `tests/helpers/`.

Managed Chromium can block real unpacked-extension tests. Report those as skipped. The popup test with an injected extension runtime is simulated at that boundary; it does not establish actual browser proxy behavior. A fixture exit is not a live location or native VPN tunnel.

Use the [strict browser acceptance command](../apps/extension/README.md) on a permitted runner. Run `node --test tests/runtime/dev.test.js` for the local recovery handoff drill. Run `python3 -B tools/check_native_host.py` on an authorized Linux candidate to check the effective process capabilities, TUN access and inspection tools before attempting a real tunnel.

Record the tested code and actual results in [STATUS.md](STATUS.md). A manual workflow is available in `.github/workflows/verify.yml`; local results do not establish that GitHub Actions has run. No release, deployment or security certification follows from a passing suite alone.
