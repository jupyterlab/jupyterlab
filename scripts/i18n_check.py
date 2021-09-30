"""Handle a hash digest of the translatable strings."""
# Copyright (c) 2021 Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory

from jupyterlab_translate.api import extract_language_pack
import polib

HERE = Path(__file__).parent

if __name__ == "__main__":
    with TemporaryDirectory() as tmp_dir:
        extract_language_pack(HERE.parent, tmp_dir, "jupyterlab", False)
        pot = polib.pofile(
            str(Path(tmp_dir) / "jupyterlab" / "locale" / "jupyterlab.pot"),
            wrapwidth=100000,
        )

    hash = sha256()
    # Use only the context and the id as the position may changed without impact
    # Sort the entry because the order in the POT file may changed (likely because code position changed)
    for entry in sorted(map(lambda e: f"{e.msgctxt!s} {e.msgid!s}", pot)):
        hash.update(entry.encode("utf-8"))

    proof = hash.hexdigest()

    print(proof)
