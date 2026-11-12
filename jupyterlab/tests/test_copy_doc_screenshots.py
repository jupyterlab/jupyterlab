# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Tests for `scripts/copy_doc_screenshots.py`."""

import importlib.util
from pathlib import Path

import pytest

SCRIPT = Path(__file__).parents[2] / "scripts" / "copy_doc_screenshots.py"

pytestmark = pytest.mark.skipif(
    not SCRIPT.exists(), reason="copy_doc_screenshots.py is only present in a source checkout"
)


@pytest.fixture
def copy_doc_screenshots():
    spec = importlib.util.spec_from_file_location("copy_doc_screenshots", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_copies_and_renames_documentation_snapshots(copy_doc_screenshots, tmp_path):
    src = tmp_path / "galata" / "test" / "documentation"
    dest = tmp_path / "images"
    snap = src / "overview.test.ts-snapshots"
    snap.mkdir(parents=True)
    (snap / "interface-jupyterlab-documentation-linux.png").write_bytes(b"shot")
    # Not a documentation snapshot: must be left alone.
    (snap / "interface-jupyterlab-linux.png").write_bytes(b"other")
    # Non-snapshot asset: must be left alone.
    data = src / "data"
    data.mkdir()
    (data / "avatar.png").write_bytes(b"avatar")

    count = copy_doc_screenshots.main(src=src, dest=dest)

    assert count == 1
    assert (dest / "interface-jupyterlab.png").read_bytes() == b"shot"
    assert not (dest / "interface-jupyterlab-linux.png").exists()
    assert not (dest / "avatar.png").exists()


def test_copies_from_multiple_test_files(copy_doc_screenshots, tmp_path):
    src = tmp_path / "galata" / "test" / "documentation"
    dest = tmp_path / "images"
    for test_file, name in [("a.test.ts", "foo"), ("b.test.ts", "bar")]:
        snap = src / f"{test_file}-snapshots"
        snap.mkdir(parents=True)
        (snap / f"{name}-documentation-linux.png").write_bytes(name.encode())

    count = copy_doc_screenshots.main(src=src, dest=dest)

    assert count == 2
    assert (dest / "foo.png").read_bytes() == b"foo"
    assert (dest / "bar.png").read_bytes() == b"bar"
