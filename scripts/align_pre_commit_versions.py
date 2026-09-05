# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
"""Keep pre-commit hook versions aligned with mirrored dependency pins."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

UTF8 = {"encoding": "utf-8"}

PRE_COMMIT_CONFIG = Path(".pre-commit-config.yaml")
PYPROJECT = Path("pyproject.toml")
ZIZMOR_WORKFLOW = Path(".github/workflows/zizmor.yml")

RUFF_PRE_COMMIT_REPO = "https://github.com/astral-sh/ruff-pre-commit"
ZIZMOR_PRE_COMMIT_REPO = "https://github.com/zizmorcore/zizmor-pre-commit"

RUFF_DEPENDENCY = re.compile(r'(?P<prefix>"ruff==)(?P<version>[^"]+)(?P<suffix>")')
ZIZMOR_UVX = re.compile(r"(?P<prefix>\buvx\s+zizmor@)(?P<version>[^\s]+)")


@dataclass(frozen=True, slots=True)
class VersionTarget:
    """A dependency version mirrored outside of the pre-commit config."""

    name: str
    pre_commit_repo: str
    mirror_path: Path
    mirror_pattern: re.Pattern[str]
    mirror_prefix: str


@dataclass(frozen=True, slots=True)
class VersionMismatch:
    """A mirrored dependency pin that does not match pre-commit."""

    target: VersionTarget
    current: str
    expected: str


VERSION_TARGETS = (
    VersionTarget(
        name="ruff",
        pre_commit_repo=RUFF_PRE_COMMIT_REPO,
        mirror_path=PYPROJECT,
        mirror_pattern=RUFF_DEPENDENCY,
        mirror_prefix="ruff==",
    ),
    VersionTarget(
        name="zizmor",
        pre_commit_repo=ZIZMOR_PRE_COMMIT_REPO,
        mirror_path=ZIZMOR_WORKFLOW,
        mirror_pattern=ZIZMOR_UVX,
        mirror_prefix="zizmor@",
    ),
)


def pre_commit_version(root: Path, repo: str) -> str:
    """Return the version for a pre-commit repo entry."""
    config = (root / PRE_COMMIT_CONFIG).read_text(**UTF8)
    block = _pre_commit_repo_block(config, repo)
    rev = re.search(
        r"^\s+rev:\s+(?P<rev>[^#\s]+)(?:\s+#\s*frozen:\s*(?P<frozen>v?[^\s]+))?",
        block,
        re.MULTILINE,
    )
    if not rev:
        msg = f"Could not find rev for {repo} in {PRE_COMMIT_CONFIG}"
        raise ValueError(msg)

    version = rev.group("frozen") or rev.group("rev")
    if re.fullmatch(r"[0-9a-f]{40}", version):
        msg = f"Could not infer version for frozen rev in {PRE_COMMIT_CONFIG}: {repo}"
        raise ValueError(msg)

    return version.removeprefix("v")


def check_versions(root: Path) -> list[str]:
    """Return a list of alignment errors."""
    return [_alignment_error(mismatch) for mismatch in _version_mismatches(root)]


def sync_versions(root: Path) -> list[str]:
    """Update mirrored dependency pins to match pre-commit."""
    updates = []

    for mismatch in _version_mismatches(root):
        mirror_path = root / mismatch.target.mirror_path
        text = mirror_path.read_text(**UTF8)
        mirror_path.write_text(
            _replace_version(mismatch.target.mirror_pattern, text, mismatch.expected),
            **UTF8,
        )
        updates.append(
            f"{mismatch.target.mirror_path.as_posix()}: {mismatch.target.name} "
            f"{mismatch.current} -> {mismatch.expected}"
        )

    return updates


def _pre_commit_repo_block(config: str, repo: str) -> str:
    repo_match = re.search(
        rf"^  - repo:\s+{re.escape(repo)}\s*$",
        config,
        re.MULTILINE,
    )
    if not repo_match:
        msg = f"Could not find {repo} in {PRE_COMMIT_CONFIG}"
        raise ValueError(msg)

    next_repo = re.search(r"^  - repo:\s+", config[repo_match.end() :], re.MULTILINE)
    end = repo_match.end() + next_repo.start() if next_repo else len(config)
    return config[repo_match.start() : end]


def _version_mismatches(root: Path) -> list[VersionMismatch]:
    mismatches = []
    for target in VERSION_TARGETS:
        expected = pre_commit_version(root, target.pre_commit_repo)
        text = (root / target.mirror_path).read_text(**UTF8)
        current = _single_version(target.mirror_pattern, text, target.mirror_path, target.name)
        if current != expected:
            mismatches.append(VersionMismatch(target, current, expected))
    return mismatches


def _alignment_error(mismatch: VersionMismatch) -> str:
    # Keep check-mode output actionable for CI logs and local runs.
    return (
        f"{mismatch.target.mirror_path.as_posix()} has {mismatch.target.mirror_prefix}"
        f"{mismatch.current}, expected {mismatch.target.mirror_prefix}"
        f"{mismatch.expected}"
    )


def _replace_version(pattern: re.Pattern[str], text: str, version: str) -> str:
    def replace(match: re.Match[str]) -> str:
        suffix = match.groupdict().get("suffix") or ""
        return f"{match.group('prefix')}{version}{suffix}"

    return pattern.sub(replace, text, count=1)


def _single_version(pattern: re.Pattern[str], text: str, path: Path, name: str) -> str:
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        msg = f"Expected exactly one {name} pin in {path}, found {len(matches)}"
        raise ValueError(msg)
    return matches[0].group("version")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--repo",
        type=Path,
        default=Path.cwd(),
        help="Repository root to update or check.",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--check",
        action="store_true",
        help="Fail if mirrored dependency pins do not match pre-commit.",
    )
    mode.add_argument(
        "--sync",
        action="store_true",
        help="Update mirrored dependency pins to match pre-commit.",
    )
    args = parser.parse_args(argv)

    try:
        if args.sync:
            updates = sync_versions(args.repo.resolve())
            if updates:
                sys.stdout.write("\n".join(updates) + "\n")
            else:
                sys.stdout.write("pre-commit dependency versions are already aligned\n")
            return 0

        errors = check_versions(args.repo.resolve())
    except ValueError as error:
        sys.stderr.write(f"{error}\n")
        return 1

    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        return 1

    sys.stdout.write("pre-commit dependency versions are aligned\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
