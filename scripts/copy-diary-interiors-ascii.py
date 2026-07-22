# -*- coding: utf-8 -*-
"""Copy diary interiors into ASCII paths for Android Metro/asset packing."""
from __future__ import annotations

import os
import shutil
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_BASE = os.path.join(ROOT, "albums", "diary", "cover", "in album")
DST_BROWN = os.path.join(ROOT, "albums", "diary", "interiors", "brown")
DST_PURPLE = os.path.join(ROOT, "albums", "diary", "interiors", "purple")


def find_dir(predicate):
    for name in os.listdir(SRC_BASE):
        full = os.path.join(SRC_BASE, name)
        if not os.path.isdir(full):
            continue
        if predicate(name):
            return full, name
    return None, None


def copy_pages(src_dir: str, dst_dir: str, expected: int) -> int:
    os.makedirs(dst_dir, exist_ok=True)
    copied = 0
    for i in range(1, expected + 1):
        name = f"page_{i:03d}.png"
        src = os.path.join(src_dir, name)
        dst = os.path.join(dst_dir, name)
        if not os.path.isfile(src):
            raise FileNotFoundError(src)
        shutil.copy2(src, dst)
        copied += 1
    return copied


def main() -> None:
    brown_dir, brown_name = find_dir(
        lambda n: "коричнев" in unicodedata.normalize("NFC", n)
        and unicodedata.is_normalized("NFC", n)
    )
    if not brown_dir:
        brown_dir, brown_name = find_dir(
            lambda n: "коричнев" in unicodedata.normalize("NFC", n)
        )
    purple_dir, purple_name = find_dir(
        lambda n: "фиолетов" in unicodedata.normalize("NFC", n)
    )
    if not brown_dir or not purple_dir:
        raise SystemExit(f"missing source dirs brown={brown_name!r} purple={purple_name!r}")

    n_brown = copy_pages(brown_dir, DST_BROWN, 60)
    n_purple = copy_pages(purple_dir, DST_PURPLE, 40)
    print(f"brown from {brown_name!r} -> {DST_BROWN} ({n_brown})")
    print(f"purple from {purple_name!r} -> {DST_PURPLE} ({n_purple})")


if __name__ == "__main__":
    main()
