#!/usr/bin/env python3
"""Check Linux tunnel test prerequisites without changing network state."""

import os
from pathlib import Path
import platform
import shutil
import stat

CAP_NET_ADMIN = 1 << 12


def has_network_admin(status: str) -> bool:
    for line in status.splitlines():
        if line.startswith("CapEff:"):
            return bool(int(line.split(":", 1)[1], 16) & CAP_NET_ADMIN)
    return False


def can_access_tun(path: Path) -> bool:
    try:
        return stat.S_ISCHR(path.stat().st_mode) and os.access(path, os.R_OK | os.W_OK)
    except OSError:
        return False


def main() -> int:
    if platform.system() != "Linux":
        print("Linux is required for this native-host check.")
        return 1

    try:
        network_admin = has_network_admin(Path("/proc/self/status").read_text())
    except (OSError, ValueError):
        network_admin = False
    checks = {
        "/dev/net/tun character device with read/write access": can_access_tun(Path("/dev/net/tun")),
        "Effective CAP_NET_ADMIN in this process": network_admin,
        "ip route and interface inspection tool": shutil.which("ip") is not None,
        "wg WireGuard inspection tool": shutil.which("wg") is not None,
    }
    for name, available in checks.items():
        print(f'{"PASS" if available else "MISSING"}  {name}')
    print("Tunnel establishment and route changes require an authorized isolated host and endpoint.")
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
