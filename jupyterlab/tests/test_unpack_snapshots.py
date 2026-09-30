# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Tests for `scripts/unpack_snapshots.py`.

Playwright reports reach the snapshot bot from an artifact built by pull
request code, so every path in them is untrusted input.
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).parents[2] / "scripts" / "unpack_snapshots.py"

pytestmark = pytest.mark.skipif(
    not SCRIPT.exists(), reason="unpack_snapshots.py is only present in a source checkout"
)


@pytest.fixture
def unpack_snapshots():
    spec = importlib.util.spec_from_file_location("unpack_snapshots", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def workspace(tmp_path, monkeypatch):
    """Lay out the directories as the snapshot update workflow does."""
    repo = tmp_path / "repo"
    artifact = tmp_path / "test-assets"
    repo.mkdir()
    artifact.mkdir()
    (tmp_path / "outside").mkdir()
    (tmp_path / "outside" / "secret.txt").write_text("secret\n")
    # Named like a snapshot, so reaching it has to be stopped by containment
    # rather than by the extension allowlist.
    (tmp_path / "outside" / "secret-linux.png").write_bytes(b"secret")
    (repo / ".git").mkdir()
    (repo / ".git" / "config").write_text("[core]\n")
    monkeypatch.chdir(repo)
    return tmp_path


def write_report(artifact_dir, expected_path, actual_path, actual_bytes=b"new-snapshot"):
    (artifact_dir / actual_path).write_bytes(actual_bytes)
    report = {
        "config": {"rootDir": "/home/runner/work/jupyterlab/jupyterlab/core/galata"},
        "suites": [
            {
                "specs": [
                    {
                        "tests": [
                            {
                                "results": [
                                    {
                                        "status": "failed",
                                        "attachments": [
                                            {"name": "a-expected.png", "path": expected_path},
                                            {"name": "a-actual.png", "path": actual_path},
                                        ],
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ],
    }
    (artifact_dir / "report.json").write_text(json.dumps(report))


def tree_state(root):
    """Snapshot every path under `root` so a stray write cannot go unnoticed."""
    state = {}
    for path in sorted(root.rglob("*")):
        key = str(path.relative_to(root))
        if path.is_symlink():
            state[key] = f"symlink -> {path.readlink()}"
        elif path.is_dir():
            state[key] = "directory"
        else:
            state[key] = path.read_bytes()
    return state


def run_unpacker(unpack_snapshots, monkeypatch):
    monkeypatch.setattr(sys, "argv", ["unpack_snapshots.py", "../test-assets"])
    return unpack_snapshots.main()


@pytest.mark.parametrize(
    "expected_path",
    [
        "galata/test/jupyterlab/demo.test.ts-snapshots/cell-linux.png",
        "galata/test/documentation/api.test.ts-snapshots/state.json",
        "examples/notebook/test-snapshots/example-linux.png",
    ],
)
def test_snapshot_is_unpacked(unpack_snapshots, workspace, monkeypatch, expected_path):
    write_report(workspace / "test-assets", expected_path, "actual.png")

    run_unpacker(unpack_snapshots, monkeypatch)

    assert (workspace / "repo" / expected_path).read_bytes() == b"new-snapshot"


@pytest.mark.parametrize(
    "expected_path",
    [
        # Traversal that resolves back into the checkout, overwriting Git
        # metadata; `core.hooksPath` there would run branch code on commit.
        "../repo/.git/config",
        ".git/config",
        "../repo/.git/hooks/post-commit",
        # Traversal that leaves the checkout entirely.
        "../outside/secret.txt",
        "/tmp/escaped.png",  # noqa: S108
        # Inside the checkout but not a snapshot.
        "scripts/unpack_snapshots.py",
        "galata/../.gitattributes",
        # A trailing newline is accepted by `$` but not by a full match.
        "galata/test/demo.test.ts-snapshots/trailing-linux.png\n",
        # Real files under galata/ that are not snapshots.
        "galata/package.json",
        "galata/test/documentation/data/extensions.json",
        "galata/test/galata/upload/upload_image.png",
    ],
)
def test_destination_outside_snapshots_is_refused(
    unpack_snapshots, workspace, monkeypatch, expected_path
):
    write_report(workspace / "test-assets", expected_path, "actual.png")
    before = tree_state(workspace)

    run_unpacker(unpack_snapshots, monkeypatch)

    assert tree_state(workspace) == before
    assert not Path("/tmp/escaped.png").exists()  # noqa: S108


def test_symlinked_snapshot_directory_is_refused(unpack_snapshots, workspace, monkeypatch):
    """An allowlisted path may be a symlink out of the checkout on the branch."""
    snapshots = workspace / "repo" / "galata" / "test" / "demo.test.ts-snapshots"
    snapshots.parent.mkdir(parents=True)
    snapshots.symlink_to(workspace / "outside")
    write_report(
        workspace / "test-assets",
        "galata/test/demo.test.ts-snapshots/secret-linux.png",
        "actual.png",
    )

    before = tree_state(workspace)

    run_unpacker(unpack_snapshots, monkeypatch)

    assert tree_state(workspace) == before


def test_source_outside_artifact_is_refused(unpack_snapshots, workspace, monkeypatch, capsys):
    """The source path decides which file is copied into the snapshot PR."""
    write_report(
        workspace / "test-assets",
        "galata/test/demo.test.ts-snapshots/leak-linux.png",
        "../outside/secret.txt",
    )

    run_unpacker(unpack_snapshots, monkeypatch)

    assert not (workspace / "repo" / "galata").exists()
    assert "Refusing to read outside of the artifact directory" in capsys.readouterr().err
