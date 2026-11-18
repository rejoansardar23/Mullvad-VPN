# Linux CLI build

The selected target is upstream Mullvad's Linux x86-64 `mullvad-cli` with `custom-vpn`, from verified archive revision `d84a4d947b2715d44c9b8f49a18491e332ff55c0`. See the [archive and gitlink comparison](FEATURE_MATRIX.md#native-platforms-and-upstream-provenance). The target does not start a daemon in this check. It provides a build gate for deciding whether to continue with the native interface.

## Verified inputs

| Input | Observed version or digest |
| --- | --- |
| Debian / architecture | Debian 13, x86_64 |
| GCC / glibc | 14.2.0 / 2.41 |
| Rust compiler | 1.100.0, `0ef1bc386059596dada8fb65b50425aab2ea637a` |
| Cargo | 1.100.0, `3acc79c0c841844675bc53a605922dbfc441e750` |
| Rust release manifest SHA-256 | `3051e859570f64a8c5acb9d09e87425db52c7d97287c67e8f6d57d7d34ef9258` |
| Rust release signing fingerprint | `108F66205EAEB0AAA8DD5E1C85AB96E6FA1BE5FE` |
| Protobuf | `libprotoc 3.21.12`, Debian `3.21.12-11+deb13u1` |
| Upstream Cargo.lock SHA-256 | `625862f333a31fafd580d2e75dd69d075c773b6fb28fbf4287e78e00890c1eff` |

The Rust channel manifest passed SHA-256 and OpenPGP verification. The downloaded `rustc`, `cargo` and `rust-std` archives passed the signed manifest's hashes before their official installers ran under a scratch prefix. The Debian Trixie `InRelease` passed signature verification with the installed Debian archive keyring. Its SHA-256 record verified the package index, which then supplied checksums for four locally extracted Protobuf packages. No host package installation or root access was needed.

Cargo resolved the locked dependencies over HTTPS from crates.io and the pinned `udp-over-tcp` Git source at `06e6438d3a2537786efde7185f5675ce5e38d45e`. Offline metadata identified up to 236 CLI dependency packages, 29 build scripts and 16 proc-macro packages in the candidate graph. Review focused on compiler/version probes, AWS-LC C compilation and the upstream Windows-only resource generation, Protobuf generation and local version generation paths. Compilation ran offline with a clean process environment and two build jobs.

## Reproduce

1. In the project checkout, run `python3 tools/extract_upstreams.py` if extraction is absent, then `python3 tools/extract_upstreams.py --verify-only`. Create a scratch directory with `vpn_native_dir=$(mktemp -d /tmp/mullvad-native-t04.XXXXXXXX)` and `mkdir -p "$vpn_native_dir"/{src,tools}`. Copy the verified tree with `cp -a build/upstream/mullvad "$vpn_native_dir/src/"`. This keeps the upstream version script outside the enclosing project Git root.
2. Acquire Rust 1.100.0 for `x86_64-unknown-linux-gnu` from the official Rust distribution. Verify `channel-rust-1.100.0.toml` against its `.sha256` and `.asc` using the fingerprint above and the official `rust-key.gpg.ascii`. Download each component using the target's `xz_url` and verify its `xz_hash` before extracting. Run each verified component's `install.sh --prefix="$vpn_native_dir/tools/rust" --disable-ldconfig` in its own extracted directory. Existing trusted Rust 1.100.0 installations may be selected through `PATH`. In the command below, adjust both `PATH` prefixes to that installation.
3. Use a trusted Protobuf compiler at least 3.15. For the Debian reproduction without system installs, verify `dists/trixie/InRelease` with `/usr/share/keyrings/debian-archive-keyring.gpg` under a scratch GPG homedir. Verify `main/binary-amd64/Packages.xz` with the signed SHA-256 entry. Use its `Filename` and `SHA256` fields to fetch and verify `protobuf-compiler`, `libprotoc32t64`, `libprotobuf32t64` and `libprotobuf-dev` at the versions above, then extract each with `dpkg-deb -x <verified.deb> "$vpn_native_dir/tools/protobuf"`. Point `PROTOC` at a local executable wrapper that runs the extracted `usr/bin/protoc` with `LD_LIBRARY_PATH` set to that extraction's `usr/lib/x86_64-linux-gnu`. This confines the alternate library lookup to the Protobuf compiler. Check `"$PROTOC" --version`.
4. Run `cd "$vpn_native_dir/src/mullvad"` and use the same Cargo cache for fetch and build. Set `PROTOC` to the trusted compiler or wrapper. For the locally extracted Debian packages, set `PROTOC_INCLUDE` to the extraction's `usr/include`. Use the environment's CA bundle for the HTTPS fetch when needed. The cloud run set `CARGO_HTTP_CAINFO="$SSL_CERT_FILE"` for fetch.

```sh
PATH="$vpn_native_dir/tools/rust/bin:/usr/bin:/bin" \
  CARGO_HOME="$vpn_native_dir/cargo" CARGO_NET_GIT_FETCH_WITH_CLI=true \
  cargo fetch --locked --target x86_64-unknown-linux-gnu
env -i PATH="$vpn_native_dir/tools/rust/bin:/usr/bin:/bin" LC_ALL=C \
  CARGO_HOME="$vpn_native_dir/cargo" CARGO_TARGET_DIR="$vpn_native_dir/target" \
  PROTOC="$PROTOC" PROTOC_INCLUDE="$PROTOC_INCLUDE" \
  cargo build --offline --locked --jobs 2 -p mullvad-cli --bin mullvad --features custom-vpn
"$vpn_native_dir/target/debug/mullvad" --version
"$vpn_native_dir/target/debug/mullvad" custom-vpn --help
sha256sum "$vpn_native_dir/target/debug/mullvad"
```

Reference inputs are the [Rust 1.100.0 release manifest](https://static.rust-lang.org/dist/channel-rust-1.100.0.toml), [Rust release key](https://static.rust-lang.org/rust-key.gpg.ascii) and [signed Debian archive metadata](https://deb.debian.org/debian/dists/trixie/InRelease).

## Results

The first empty target directory compiled 193 units in 1m54s. The selected dependency graph built with the installed C toolchain and did not require CMake or system package changes. Both CLI smoke commands passed. `--version` printed `mullvad-cli 2026.5` and `custom-vpn --help` showed the custom configuration subcommands.

| Debug build | Type | Size | SHA-256 |
| --- | --- | ---: | --- |
| First clean target | Linux x86-64 ELF PIE | 105,176,872 bytes | `2650b568b5438eb0c21653bd7738dd42cbd74b7a3896a85d1ebec968c06a0ea5` |
| Second clean target | Linux x86-64 ELF PIE | 105,177,664 bytes | `b3427cac1823c2b334e87d278e06febd5c39b2b05421fe0c8ee8577f9c68eeec` |

The second run used a different empty target directory and the same verified source and dependency cache. It compiled 193 units in 1m35s. The two CLI outputs matched byte for byte. The debug binaries contain their own absolute generated-build paths and have different hashes. The checks establish that the target builds again and its CLI smoke is repeatable. They leave binary reproducibility unverified.

The build produced scratch artifacts only. No native daemon, privileged networking, endpoint, external account, installer or distribution workflow was exercised. Host and endpoint acceptance remain separate.
