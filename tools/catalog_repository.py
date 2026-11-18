#!/usr/bin/env python3
"""Collect static functional/source/workspace catalogs without executing project code.

Run from any directory with Python 3.12+. Writes only generated catalogs under
docs/repository/. Never executes imports, application commands, builds or tests.
Ignored workspace entries are counted without publishing their local identities.
Git internals and ignored file contents are not read.
"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "docs/repository"
GENERATED = {
    "docs/repository/FILE_CATALOG.json",
    "docs/repository/WORKSPACE_INVENTORY.tsv",
    "docs/repository/WORKSPACE_SUMMARY.txt",
}
IGNORED_GROUPS = {
    ".local": "private-development-state",
    "build": "generated-native-sources",
    "dist": "generated-extension-artifact",
    "node_modules": "installed-dependency",
}
PURPOSES = {
    ".gitleaksignore": "Exact reviewed historical prose finding exclusion; other credential detections remain active",
    ".editorconfig": "Shared source whitespace and editor policy",
    ".gitignore": "Generated artifacts and private-state exclusion policy",
    ".node-version": "Pinned Node runtime for TypeScript stripping and SQLite",
    ".npmrc": "Exact dependency saves and npm installation behavior",
    "package.json": "Root command interface and direct dependency declarations",
    "package-lock.json": "Frozen npm dependency graph, versions and integrity",
    "tsconfig.json": "Strict compiler policy for extension and control API",
    "README.md": "Current project entry point, boundaries and development commands",
    "AGENTS.md": "Current owner instructions, preservation and delivery requirements",
    "CONTRIBUTING.md": "Contributor workflow and validation policy",
    "SECURITY.md": "Private reporting and account-recovery responsibilities",
    "PROJECT_IDEA.txt": "Detailed product vision, feasibility, responsibilities and staged roadmap",
    "PROJECT_STRUCTURE.md": "Functional folder organization and dependency map",
    "PROJECT_HANDOFF.md": "Component and archive inventory, task backlog and review criteria",
    "docs/FEATURE_MATRIX.md": "Feature implementation, test evidence and native build prerequisites",
    "docs/NATIVE_LINUX_BUILD.md": "Verified pinned Linux CLI build procedure and artifact identities",
    "apps/extension/core.ts": "Proxy route controller, schema validation, auth scoping and lifecycle state",
    "apps/extension/worker.ts": "MV3 background events, session restoration and proxy-auth challenges",
    "apps/extension/popup.ts": "Popup UI actions and extension session interaction",
    "apps/extension/popup.html": "Browser extension connection-interface document",
    "apps/extension/popup.css": "Browser extension visual presentation",
    "apps/extension/manifest.json": "Chrome MV3 permissions, worker and popup registration",
    "apps/extension/build.js": "Unpacked extension asset copying and TypeScript stripping",
    "apps/extension/README.md": "Browser installation, lifecycle and protection boundaries",
    "apps/operations/app.js": "Private founder dashboard authentication, status and grant revocation UI",
    "apps/operations/index.html": "Private operations/help document served by control API",
    "apps/operations/style.css": "Private founder dashboard presentation",
    "services/control-api/server.ts": "HTTPS account/grant/status routes, CORS and operations assets",
    "services/control-api/store.ts": "SQLite accounts, hashed secrets, grants, usage and retention",
    "services/control-api/cli.ts": "Operator account creation and recovery interface",
    "services/gateway/index.js": "TLS forward-proxy adapter, authorization, metering and active revocation",
    "services/gateway/policy.js": "Public-destination restrictions and validated/pinned DNS policy",
    "scripts/development/dev.mjs": "Local state initialization and loopback development service assembly",
    "scripts/recovery/backup.mjs": "Authenticated encrypted SQLite backup and protected restore",
    "scripts/packaging/package.mjs": "Deterministic extension archive, checksum and dependency notices",
    "scripts/README.md": "Operator/developer tooling usage and private-state requirements",
    "infrastructure/serve.mjs": "Configured API/gateway runtime assembly and preflight validation",
    "infrastructure/config.example.json": "Non-live runtime configuration template with placeholder hosts",
    "infrastructure/private-browser-proxy.service": "Unapplied service-manager deployment example",
    "infrastructure/firewall.nft.example": "Unapplied host network-policy example",
    "infrastructure/README.md": "Runtime and host deployment prerequisites",
    "tests/helpers/tls.js": "Shared temporary TLS identity fixture for component suites",
    "tests/helpers/chromium-extension.js": "Managed policy and prerequisite checks for real browser acceptance",
    "tools/check_native_host.py": "Read-only Linux tunnel test prerequisite checks",
    "tools/extract_upstreams.py": "Offline checksum-pinned native-source recreation and preservation",
    "tools/catalog_repository.py": "Static functional, reference and filesystem catalog generation",
    "tools/.gitignore": "Python bytecode exclusion for repository tooling",
    "tools/tests/test_extract_upstreams.py": "Preserved real-filesystem archive safety regression suite",
    "tools/tests/test_catalog_repository.py": "Catalog scope and ignored workspace redaction regressions",
    "tools/tests/test_check_native_host.py": "Linux capability and device-access check regressions",
    ".github/workflows/verify.yml": "Manual security/build/test verification; no automatic run in this task",
    "AnalyseFuture/PRESERVATION_MANIFEST.json": "Every baseline file's exact preserved destination and content identity",
}
TEST_PURPOSES = {
    "control-api.test.js": "Founder account/session/grant HTTPS API behavior",
    "retention.test.js": "Durable aggregate quota, expiry and revocation retention",
    "extension.test.js": "Extension route controller and worker lifecycle/auth behavior",
    "extension-browser.test.js": "Actual MV3-load or explicit managed-policy skip and simulated popup UI",
    "chromium-route.test.js": "Actual browser TLS-proxy routing and revoked-grant behavior, where permitted",
    "gateway.test.js": "TLS forwarding, destination policy, revocation, quotas and socket cleanup",
    "integration.test.js": "Cross-component account/grant/traffic/recovery and logout flows",
    "ops.test.js": "Encrypted backup/restore integrity, permissions and overwrite protection",
    "package.test.js": "Deterministic archive, notices and secret-file exclusion",
    "website.test.js": "Private operations dashboard rendering and user actions",
    "security.test.js": "Cross-session founder revocation and invalid bearer denial",
    "dev.test.js": "Local initialization, fixture mode and retained-state recovery",
    "runtime.test.js": "Runtime preflight, TLS API startup and service lifecycle",
}


def category(path: str) -> str:
    parts = path.split("/")
    if parts[0] == "AnalyseFuture":
        return "preserved-history/" + (parts[1] if len(parts) > 1 and "." not in parts[1] else "index")
    if parts[0] in ("apps", "services", "tests", "scripts") and len(parts) > 1:
        return "/".join(parts[:2]) if "." not in parts[1] else parts[0]
    if parts[0] == "build":
        return "generated-native-sources"
    if parts[0] == "node_modules":
        return "installed-dependency"
    if parts[0] == "dist":
        return "generated-extension-artifact"
    if parts[0] == ".local":
        return "private-development-state"
    return parts[0] if len(parts) > 1 or (ROOT / path).is_dir() else "project-root"


def purpose(path: str) -> str:
    if path in PURPOSES:
        return PURPOSES[path]
    p = Path(path)
    if p.name in TEST_PURPOSES and path.startswith("tests/"):
        return TEST_PURPOSES[p.name]
    if path.startswith("AnalyseFuture/"):
        return "Historical material/original source retained for owner review; not current execution guidance"
    if path.startswith("upstream/archives/"):
        return "Original separately licensed native application source archive; preserve vendor build layout"
    if path.startswith("docs/repository/"):
        return "Functional source inventory, dependency clues or workspace coverage record"
    if path.startswith("docs/"):
        return "Current " + p.stem.lower().replace("_", " ") + " operational guidance"
    if path.startswith(".github/ISSUE_TEMPLATE/"):
        return "Structured " + p.stem.replace("_", " ") + " intake without sensitive disclosure"
    if p.name == "README.txt":
        return "Collection purpose, provenance and handling rules"
    return "Component asset associated with " + category(path)


def references(path: str) -> list[dict[str, str]]:
    p = ROOT / path
    if path.startswith("AnalyseFuture/"):
        return []
    if p.suffix == ".html":
        text = p.read_text(encoding="utf-8")
        refs = set(re.findall(r'(?:src|href)=[\'"]([^\'"]+)[\'"]', text))
    elif path == "apps/extension/manifest.json":
        manifest = json.loads(p.read_text())
        refs = {manifest["background"]["service_worker"], manifest["action"]["default_popup"]}
    elif p.suffix in (".js", ".ts", ".mjs", ".py"):
        text = p.read_text(encoding="utf-8")
        refs = set(re.findall(r"\bfrom\s*['\"]([^'\"]+)['\"]", text))
        refs.update(re.findall(r"\bimport\s*\(\s*['\"]([^'\"]+)['\"]", text))
        if p.suffix == ".py":
            for match in re.finditer(r"^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))", text, re.M):
                module = match.group(1) or match.group(2)
                target = ROOT / (module.replace(".", "/") + ".py")
                refs.add("./" + os.path.relpath(target, p.parent) if target.exists() else module)
    else:
        return []
    result = []
    for ref in sorted(refs):
        item = {"literal": ref, "kind": "external-or-runtime"}
        if "://" in ref or ref.startswith("#"):
            result.append(item)
            continue
        if ref.startswith(".") or p.suffix == ".html" or path == "apps/extension/manifest.json":
            target = (p.parent / ref).resolve()
            item["kind"] = "relative-asset" if p.suffix == ".html" or path.endswith("manifest.json") else "relative-module"
            if target.is_relative_to(ROOT):
                item["resolved_path"] = target.relative_to(ROOT).as_posix()
                if target.exists():
                    item["observation"] = "file-present"
                elif target.suffix == ".js" and target.with_suffix(".ts").exists():
                    item["source_path"] = target.with_suffix(".ts").relative_to(ROOT).as_posix()
                    item["observation"] = "generated-js-from-typescript"
                else:
                    item["observation"] = "not-present-at-static-review"
        result.append(item)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-only", action="store_true", help="refresh FILE_CATALOG.json without a workspace scan")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    paths = set()
    for command in (["git", "ls-files", "-z"], ["git", "ls-files", "--others", "--exclude-standard", "-z"]):
        paths.update(subprocess.check_output(command, cwd=ROOT).decode().split("\0"))
    paths.discard("")
    paths.update(GENERATED)
    files = [{"path": p, "functional_collection": category(p), "purpose": purpose(p),
              "literal_dependencies": references(p) if not (ROOT / p).is_symlink() and (ROOT / p).is_file() else []}
             for p in sorted(paths) if (ROOT / p).is_file() or (ROOT / p).is_symlink() or p in GENERATED]
    (OUTPUT / "FILE_CATALOG.json").write_text(json.dumps({
        "scope": "Existing Git-tracked project files, nonignored additions and catalog outputs.",
        "method": "Content/path-aware functional classification and bounded literal import observation; no execution or resolved semantic/security audit.",
        "files": files,
        "node_command_and_dependency_interface": json.loads((ROOT / "package.json").read_text()),
        "locked_dependency_relationships": {name: {
            key: value for key, value in entry.items()
            if key in ("version", "dependencies", "optionalDependencies", "peerDependencies", "dev", "optional", "os", "cpu", "license")
        } for name, entry in json.loads((ROOT / "package-lock.json").read_text())["packages"].items()},
    }, indent=2) + "\n")
    if args.project_only:
        print(f"Cataloged {len(files)} project files. Workspace inventory was not scanned or changed.")
        return
    write_workspace_inventory({item["path"] for item in files})


def write_workspace_inventory(project_paths: set[str]) -> None:
    project_dirs = {parent.as_posix() for path in project_paths for parent in Path(path).parents}
    rows = []
    totals = collections.Counter()
    errors = []
    redacted_count = 0
    for directory, subdirs, names in os.walk(
        ROOT, followlinks=False, onerror=lambda error: errors.append(error.strerror or type(error).__name__)
    ):
        parent = Path(directory)
        if parent == ROOT:
            subdirs[:] = [name for name in subdirs if name != ".git"]
            names = [name for name in names if name != ".git"]
        subdirs.sort()
        for name in sorted(subdirs + names):
            p = parent / name
            relative = p.relative_to(ROOT).as_posix()
            try:
                info = p.lstat()
            except OSError as error:
                errors.append(error.strerror or type(error).__name__)
                continue
            kind = {
                stat.S_IFLNK: "symlink", stat.S_IFDIR: "directory", stat.S_IFREG: "file",
            }.get(stat.S_IFMT(info.st_mode), "special")
            if relative not in project_paths and (kind != "directory" or relative not in project_dirs):
                group = IGNORED_GROUPS.get(relative.split("/", 1)[0], "other-non-project-entry")
                totals[(group, kind)] += 1
                redacted_count += 1
                rows.append([f"<redacted-workspace-entry-{redacted_count}>", kind, group, "", "local-content-not-read", ""])
                continue
            group = category(relative)
            totals[(group, kind)] += 1
            digest = ""
            source_identity = ""
            if relative in GENERATED:
                source_identity = "catalog-output-no-self-hash"
            elif kind == "file":
                with p.open("rb") as stream:
                    digest = hashlib.file_digest(stream, "sha256").hexdigest()
            elif kind == "symlink":
                source_identity = "link-text:" + os.readlink(p)
            rows.append([relative, kind, group, str(info.st_size) if kind == "file" else "", source_identity, digest])
    # Git metadata is deliberately preserved, never traversed as project source.
    rows.append([".git/", "git-internals", "protected-git-history", "", "not-traversed", ""])
    present = {r[0] for r in rows}
    for name in GENERATED - present:
        rows.append([name, "file", category(name), "", "catalog-output-no-self-hash", ""])
    with (OUTPUT / "WORKSPACE_INVENTORY.tsv").open("w", newline="") as stream:
        writer = csv.writer(stream, delimiter="\t", lineterminator="\n")
        writer.writerow(["path", "kind", "functional_collection", "bytes", "content_relationship", "sha256"])
        writer.writerows([[value if value else "-" for value in row] for row in sorted(rows)])
    lines = [
        "STATIC WORKSPACE COVERAGE",
        "No application, archived code, tests or builds are executed by this catalog.",
        "All filesystem paths are visited except protected .git internals; symlinks are never followed.",
        "Ignored and other non-project entries are grouped and counted without local paths, sizes, link targets or hashes.",
        "Use the upstream catalog and extractor verification to establish preserved source identity.",
        "Counts describe this workspace snapshot, not required future generated state or test readiness.",
        f"Authored/preserved project file records: {len(project_paths)}",
        f"Filesystem inventory rows (including dirs and protected Git marker): {len(rows)}",
        f"Traversal errors: {len(errors)}",
        "",
    ]
    for (group, kind), count in sorted(totals.items()):
        lines.append(f"{group}: {kind}={count}")
    lines.extend(["", "Traversal errors:", *errors] if errors else [])
    (OUTPUT / "WORKSPACE_SUMMARY.txt").write_text("\n".join(lines) + "\n")
    print(f"Cataloged {len(project_paths)} project files and {len(rows)} workspace entries; traversal errors: {len(errors)}. No tests executed.")


if __name__ == "__main__":
    main()
