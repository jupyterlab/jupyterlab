# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import importlib.util
import sys
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[2]
SCRIPT = ROOT / "scripts/align_pre_commit_versions.py"

if not SCRIPT.exists():
    pytest.skip("requires a JupyterLab git checkout", allow_module_level=True)

spec = importlib.util.spec_from_file_location("align_pre_commit_versions", SCRIPT)
assert spec is not None
assert spec.loader is not None
align_pre_commit_versions = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = align_pre_commit_versions
spec.loader.exec_module(align_pre_commit_versions)


def test_pre_commit_versions_are_aligned():
    assert align_pre_commit_versions.check_versions(ROOT) == []


def test_sync_versions(tmp_path):
    _write(
        tmp_path / ".pre-commit-config.yaml",
        """
        repos:
          - repo: https://github.com/zizmorcore/zizmor-pre-commit
            rev: 451b56af716f9f0d0c2b816503a3fd0cf8b036fa  # frozen: v1.2.3
            hooks:
              - id: zizmor

          - repo: https://github.com/astral-sh/ruff-pre-commit
            rev: v4.5.6
            hooks:
              - id: ruff
        """,
    )
    _write(
        tmp_path / "pyproject.toml",
        """
        [project.optional-dependencies]
        dev = [
            "ruff==0.0.1",
        ]
        """,
    )
    _write(
        tmp_path / ".github/workflows/zizmor.yml",
        """
        jobs:
          zizmor:
            steps:
              - run: uvx zizmor@0.0.2 --format=sarif . > results.sarif
        """,
    )

    assert align_pre_commit_versions.check_versions(tmp_path) == [
        "pyproject.toml has ruff==0.0.1, expected ruff==4.5.6",
        ".github/workflows/zizmor.yml has zizmor@0.0.2, expected zizmor@1.2.3",
    ]
    assert align_pre_commit_versions.sync_versions(tmp_path) == [
        "pyproject.toml: ruff 0.0.1 -> 4.5.6",
        ".github/workflows/zizmor.yml: zizmor 0.0.2 -> 1.2.3",
    ]
    assert align_pre_commit_versions.check_versions(tmp_path) == []
    assert '"ruff==4.5.6"' in (tmp_path / "pyproject.toml").read_text()
    assert "uvx zizmor@1.2.3" in (tmp_path / ".github/workflows/zizmor.yml").read_text()


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).lstrip(), encoding="utf-8")
