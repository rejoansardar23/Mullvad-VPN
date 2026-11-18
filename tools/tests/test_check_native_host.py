import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools import check_native_host


class NativeHostCheckTests(unittest.TestCase):
    def test_reads_effective_network_admin_instead_of_permitted_capabilities(self):
        self.assertTrue(check_native_host.has_network_admin("CapEff:\t0000000000001001"))
        self.assertFalse(check_native_host.has_network_admin("CapPrm:\t0000000000001000\nCapEff:\t0000000000000001"))
        self.assertFalse(check_native_host.has_network_admin(""))

    def test_requires_a_character_device_and_read_write_access(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "tun"
            self.assertFalse(check_native_host.can_access_tun(path))
            path.touch()
            self.assertFalse(check_native_host.can_access_tun(path))
        with patch.object(check_native_host.stat, "S_ISCHR", return_value=True):
            with patch.object(check_native_host.os, "access", return_value=False) as access:
                self.assertFalse(check_native_host.can_access_tun(Path(os.devnull)))
                access.assert_called_once_with(Path(os.devnull), os.R_OK | os.W_OK)
