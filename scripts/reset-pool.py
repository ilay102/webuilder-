#!/usr/bin/env python3
"""
reset-pool.py — Free stuck images in the Carti pool.

Every test demo build LOCKS images to its slug. If a demo is deleted
without unlocking (which is what reset-test.sh does), the locks become
zombies and eventually exhaust the pool ("Image pool exhausted" error).

This script flips every "locked" / "in-use" entry back to "available"
and clears the assignment metadata. Safe to run anytime — at worst
it interrupts an in-flight build, which will just re-pick on retry.

Usage on VPS:
    python3 /root/webuilder/reset-pool.py
"""

import json
import sys
from pathlib import Path

POOLS = [
    "/root/webuilder/pool-state.json",
    "/root/webuilder/text-pool-state.json",
]

ASSIGN_KEYS = ("assignedTo", "assignedAt", "lockedAt")
DIRTY_STATUSES = ("locked", "in-use")

def reset_pool(path: str) -> int:
    p = Path(path)
    if not p.exists():
        print(f"[skip] {path} (not found)")
        return 0

    data = json.loads(p.read_text(encoding="utf-8"))
    n = 0

    # Most pool files use { items: [...] } or { images: [...] }
    for key, val in data.items():
        if not isinstance(val, list):
            continue
        for item in val:
            if not isinstance(item, dict):
                continue
            if item.get("status") in DIRTY_STATUSES:
                item["status"] = "available"
                for k in ASSIGN_KEYS:
                    item.pop(k, None)
                n += 1

    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[ok]   {path}: freed {n}")
    return n

def main() -> int:
    total = sum(reset_pool(p) for p in POOLS)
    print(f"\n✅ Total images released: {total}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
