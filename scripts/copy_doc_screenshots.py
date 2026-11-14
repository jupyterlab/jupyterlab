# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
"""Copy galata documentation screenshots into the docs source tree.

The Jupyter Book (MyST MD) build has no Sphinx setup() hook, so the automated
screenshots produced by the galata `documentation` project are copied into
`docs/source/images/` before the build. Each `<name>-documentation-linux.png`
snapshot is flattened to `<name>.png`, matching the docs' relative
`../images/<name>.png` references.
"""

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "galata" / "test" / "documentation"
DEST = ROOT / "docs" / "source" / "images"
SUFFIX = "-documentation-linux"


def main(src: Path = SRC, dest: Path = DEST) -> int:
    dest.mkdir(parents=True, exist_ok=True)
    copied = []
    for img in sorted(src.rglob(f"*{SUFFIX}.png")):
        target = dest / img.name.replace(SUFFIX, "")
        shutil.copyfile(img, target)
        copied.append(target.name)
    return len(copied)


if __name__ == "__main__":
    main()
