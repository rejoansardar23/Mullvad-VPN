"""Verify catalog publication scope with a disposable Git checkout."""

import csv
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from tools import catalog_repository


class RepositoryCatalogTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="repository-catalog-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.script = self.root / "tools/catalog_repository.py"
        self.script.parent.mkdir()
        shutil.copyfile(catalog_repository.__file__, self.script)
        subprocess.run(["git", "init", "--quiet", str(self.root)], check=True)
        (self.root / ".gitignore").write_text("*.key\n.local/\nbuild/\n")
        (self.root / "package.json").write_text("{}")
        (self.root / "package-lock.json").write_text('{"packages": {}}')
        self.output = self.root / "docs/repository"
        self.output.mkdir(parents=True)

    def run_catalog(self, *options):
        subprocess.run([sys.executable, "-B", str(self.script), *options], check=True, capture_output=True)

    def test_project_only_preserves_workspace_snapshots(self):
        names = ("WORKSPACE_INVENTORY.tsv", "WORKSPACE_SUMMARY.txt")
        for name in names:
            (self.output / name).write_text("existing snapshot")

        self.run_catalog("--project-only")

        catalog = json.loads((self.output / "FILE_CATALOG.json").read_text())
        self.assertIn("package.json", {entry["path"] for entry in catalog["files"]})
        for name in names:
            self.assertEqual((self.output / name).read_text(), "existing snapshot")

    def test_workspace_catalog_redacts_ignored_entries(self):
        public_dir = self.root / "tools"
        ignored_key = public_dir / "local-tls-material.key"
        ignored_content = b"fixture key data"
        ignored_key.write_bytes(ignored_content)
        (self.root / ".local").mkdir()
        (self.root / ".local/unpublished-cache").write_bytes(ignored_content)
        (self.root / "build").mkdir()
        (self.root / "build/local-symlink").symlink_to("../unpublished-location")

        self.run_catalog()

        with (self.output / "WORKSPACE_INVENTORY.tsv").open(newline="") as inventory:
            rows = {row["path"]: row for row in csv.DictReader(inventory, delimiter="\t")}
        self.assertIn("tools/catalog_repository.py", rows)
        redacted = [row for row in rows.values() if row["content_relationship"] == "local-content-not-read"]
        self.assertEqual(len(redacted), 5)
        self.assertEqual({row["sha256"] for row in redacted}, {"-"})
        self.assertEqual({row["bytes"] for row in redacted}, {"-"})
        generated_text = "".join(path.read_text() for path in self.output.iterdir())
        for private_identity in (
            ignored_key.name, "unpublished-cache", "local-symlink", "unpublished-location",
            hashlib.sha256(ignored_content).hexdigest(),
        ):
            self.assertNotIn(private_identity, generated_text)
