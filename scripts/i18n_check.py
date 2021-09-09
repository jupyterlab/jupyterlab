"""Handle a hash digest of the translatable strings."""
# Copyright (c) 2021 Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import argparse
import os
import sys
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory

from jupyterlab_translate.api import extract_language_pack
import polib

HERE = Path(__file__).parent
LOCK_FILE = HERE.parent / "i18n.lock"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-u",
        "--update-snapshot",
        action="store_true",
        help="Update the translatable strings hash.",
    )

    args = parser.parse_args()

    with TemporaryDirectory() as tmp_dir:
        extract_language_pack(HERE.parent, tmp_dir, "jupyterlab", False)
        pot = polib.pofile(
            str(Path(tmp_dir) / "jupyterlab" / "locale" / "jupyterlab.pot"),
            wrapwidth=100000,
        )

    hash = sha256()
    for entry in pot:
        hash.update(str(entry).encode("utf-8"))

    proof = hash.hexdigest()

    if args.update_snapshot:
        LOCK_FILE.write_text(proof)
        print(f"`{LOCK_FILE.name}` updated.")
    else:
        expected = ""
        if LOCK_FILE.exists():
            expected = LOCK_FILE.read_text().strip()

        if proof != expected:
            if os.environ.get("GITHUB_BASE_REF", "") == "master":
                print(
                    f"""Translatable strings have changed, please update the `{LOCK_FILE.name}` file by executing:
                
    ```bash
    python -m pip install jupyterlab-translate
    python scripts/i18n_check.py -u
    ```
    """
                )
            else:
                print(
                    "Translatable strings have changed, this is only allowed on major or minor version bumps."
                )

            sys.exit(1)
