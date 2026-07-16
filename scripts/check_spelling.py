#!/usr/bin/env python3
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Run Sphinx spelling checks for changed text-document content."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parent.parent
DOCS_SOURCE = ROOT / "docs" / "source"
TEXT_DOCUMENT_SUFFIXES = {".md", ".txt"}
EXCLUDED_TEXT_DOCUMENTS = {
    "CHANGELOG.md",
    "docs/source/spelling_wordlist.txt",
    "scripts/release_template.txt",
}
SUPPORT_FILE_PATHS = {
    ".github/workflows/spell-check.yml",
    "docs/source/conf.py",
    "docs/source/spelling_wordlist.txt",
    "pyproject.toml",
    "scripts/check_spelling.py",
}
SUPPORT_FILE_PREFIXES = ("docs/source/_ext/",)
SPELLING_INDEX = "__spelling_index"
SPELLING_WORDLIST = DOCS_SOURCE / "spelling_wordlist.txt"

HUNK_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+(?P<start>\d+)(?:,\d+)? @@")
SPELLING_RE = re.compile(r"^(?P<source>.*):(?P<line>\d+|None):(?P<rest>.*)$")


def git_output(args: list[str]) -> str:
    """Run git and return stdout, exiting with a useful error on failure."""
    result = subprocess.run(  # noqa: S603
        ["git", *args],  # noqa: S607
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr
        message = f"git {' '.join(args)} failed:\n{stderr}"
        raise SystemExit(message)

    return result.stdout


def diff_args(args: argparse.Namespace) -> list[str]:
    """Return the git diff range arguments for the requested mode."""
    if args.staged:
        if args.base or args.head:
            message = "--staged cannot be combined with --base or --head"
            raise SystemExit(message)
        return ["--cached"]

    if not args.base or not args.head:
        message = "Provide --staged or provide --base and --head."
        raise SystemExit(message)

    return [f"{args.base}...{args.head}"]


def is_text_document(path: str) -> bool:
    """Return whether a path is a text document checked for spelling."""
    if path in EXCLUDED_TEXT_DOCUMENTS:
        return False

    suffix = Path(path).suffix.lower()
    if suffix == ".txt" and path.startswith("galata/"):
        return False

    return suffix in TEXT_DOCUMENT_SUFFIXES


def is_support_file(path: str) -> bool:
    """Return whether a path can affect spelling check behavior."""
    if path in SUPPORT_FILE_PATHS:
        return True

    return any(path.startswith(prefix) for prefix in SUPPORT_FILE_PREFIXES)


def tracked_text_documents() -> list[str]:
    """Return all tracked text documents checked by the spelling job."""
    paths = git_output(["ls-files", "--", "*.md", "*.txt"]).splitlines()
    documents = [path for path in paths if is_text_document(path)]
    return sorted(documents)


def changed_text_document_lines(git_diff_args: list[str]) -> dict[str, set[int]]:
    """Return changed line numbers for text documents."""
    diff = git_output(
        [
            "diff",
            "--unified=0",
            "--no-color",
            "--no-ext-diff",
            "--diff-filter=ACMR",
            *git_diff_args,
            "--",
        ]
    )

    changed: dict[str, set[int]] = defaultdict(set)
    current_path: str | None = None
    current_line: int | None = None

    for raw_line in diff.splitlines():
        if raw_line.startswith("+++ "):
            target = raw_line[4:].removeprefix("b/")
            current_path = target if is_text_document(target) else None
            current_line = None
            continue

        hunk_match = HUNK_RE.match(raw_line)
        if hunk_match:
            current_line = int(hunk_match.group("start")) if current_path else None
            continue

        if current_path is None or current_line is None:
            continue

        if raw_line.startswith("+") and not raw_line.startswith("+++"):
            changed[current_path].add(current_line)
            current_line += 1
        elif raw_line.startswith("-") and not raw_line.startswith("---"):
            continue
        elif raw_line.startswith(" "):
            current_line += 1
        else:
            continue

    return dict(changed)


def changed_support_files(git_diff_args: list[str]) -> list[str]:
    """Return changed files that can affect spelling check behavior."""
    paths = git_output(
        [
            "diff",
            "--name-only",
            "--diff-filter=ACMR",
            *git_diff_args,
            "--",
        ]
    ).splitlines()

    support_files = [path for path in paths if is_support_file(path)]
    return sorted(support_files)


def copy_tracked_files(source_dir: Path, *, staged: bool) -> None:
    """Copy tracked repository files into the temporary source tree."""
    if staged:
        result = subprocess.run(  # noqa: S603
            ["git", "checkout-index", "--all", f"--prefix={source_dir}{os.sep}"],  # noqa: S607
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            message = f"git checkout-index failed:\n{result.stderr}"
            raise SystemExit(message)
        return

    for path in git_output(["ls-files"]).splitlines():
        source = ROOT / path
        if not source.is_file():
            continue

        target = source_dir / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def read_git_index_file(path: str) -> bytes:
    """Read a file from the git index."""
    result = subprocess.run(  # noqa: S603
        ["git", "show", f":{path}"],  # noqa: S607
        cwd=ROOT,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode()
        message = f"git show :{path} failed:\n{stderr}"
        raise SystemExit(message)

    return result.stdout


def write_spelling_source(
    source_dir: Path,
    spelling_paths: list[str],
    *,
    staged: bool,
) -> list[Path]:
    """Copy docs into a temporary Sphinx source tree."""
    copy_tracked_files(source_dir, staged=staged)

    wordlist = source_dir / SPELLING_WORDLIST.name
    if staged:
        wordlist.write_bytes(read_git_index_file(SPELLING_WORDLIST.relative_to(ROOT).as_posix()))
    else:
        shutil.copy2(SPELLING_WORDLIST, wordlist)

    spelling_docs = []
    for path in spelling_paths:
        target = source_dir / path
        spelling_docs.append(target)

    index = source_dir / f"{SPELLING_INDEX}.md"
    toctree_entries = "\n".join(str(Path(path).with_suffix("")) for path in spelling_paths)
    index.write_text(
        "Spelling check\n"
        "==============\n\n"
        "```{toctree}\n"
        ":maxdepth: 1\n\n"
        f"{toctree_entries}\n"
        "```\n",
        encoding="utf-8",
    )

    return spelling_docs


def check_spelling_backend() -> bool:
    """Return whether the optional native spelling backend is available."""
    try:
        __import__("enchant")
        __import__("sphinxcontrib.spelling")
    except Exception as error:
        sys.stderr.write(
            "Sphinx spelling checks need pyenchant, Enchant/Aspell, and an English "
            f"dictionary installed.\nImport failed with: {error}\n"
        )
        return False

    return True


def run_sphinx(source_dir: Path, build_dir: Path, spelling_docs: list[Path]) -> int:
    """Run the Sphinx spelling builder on the temporary source tree."""
    env = os.environ.copy()
    env["JUPYTERLAB_SPELLING_BUILD"] = "1"
    config_dir = source_dir / DOCS_SOURCE.relative_to(ROOT)

    command = [
        sys.executable,
        "-m",
        "sphinx",
        "-Q",
        "-b",
        "spelling",
        "--keep-going",
        "-D",
        f"master_doc={SPELLING_INDEX}",
        "-c",
        str(config_dir),
        str(source_dir),
        str(build_dir),
        *[str(path) for path in spelling_docs],
    ]
    result = subprocess.run(command, cwd=ROOT, env=env, check=False)  # noqa: S603
    return result.returncode


def path_from_source(source: str, source_dir: Path) -> str | None:
    """Map a Sphinx source path back to its repository path."""
    if source == "<unknown>":
        return None

    source_path = Path(source)
    if not source_path.is_absolute():
        source_path = ROOT / source_path
    source_path = source_path.resolve()

    try:
        relative = source_path.relative_to(source_dir.resolve())
    except ValueError:
        normalized = source.replace(os.sep, "/")
        return normalized if is_text_document(normalized) else None

    return relative.as_posix()


def parse_spelling_line(source_dir: Path, line: str) -> tuple[str, int, str] | None:
    """Parse one line from a Sphinx spelling report."""
    match = SPELLING_RE.match(line)
    if not match or match.group("line") == "None":
        return None

    path = path_from_source(match.group("source"), source_dir)
    if path is None:
        return None

    line_number = int(match.group("line"))
    return path, line_number, f"{path}:{line_number}:{match.group('rest')}"


def spelling_errors_on_changed_lines(
    build_dir: Path, source_dir: Path, changed_lines: dict[str, set[int]]
) -> tuple[list[str], int]:
    """Return spelling errors on changed lines and the ignored error count."""
    errors: list[str] = []
    ignored = 0

    for report in sorted(build_dir.rglob("*.spelling")):
        if report.stat().st_size == 0:
            continue

        for line in report.read_text(encoding="utf-8").splitlines():
            spelling_error = parse_spelling_line(source_dir, line)
            if spelling_error is None:
                errors.append(line)
                continue

            path, line_number, text = spelling_error
            if line_number in changed_lines.get(path, set()):
                errors.append(text)
            else:
                ignored += 1

    return errors, ignored


def spelling_errors(build_dir: Path, source_dir: Path) -> list[str]:
    """Return every spelling error reported by Sphinx."""
    errors: list[str] = []

    for report in sorted(build_dir.rglob("*.spelling")):
        if report.stat().st_size == 0:
            continue

        for line in report.read_text(encoding="utf-8").splitlines():
            spelling_error = parse_spelling_line(source_dir, line)
            if spelling_error is None:
                errors.append(line)
                continue

            _, _, text = spelling_error
            errors.append(text)

    return errors


def spelling_paths_for_run(changed_paths: list[str], support_paths: list[str]) -> list[str]:
    """Return the document paths that Sphinx should check."""
    if support_paths:
        return tracked_text_documents()

    return changed_paths


def report_spelling_scope(changed_paths: list[str], support_paths: list[str]) -> None:
    """Print which files caused the spelling run."""
    if support_paths:
        sys.stdout.write("Spelling support files changed; checking all text documents:\n")
        for path in support_paths:
            sys.stdout.write(f"  {path}\n")
        return

    sys.stdout.write("Running Sphinx spelling for changed text documents:\n")
    for path in changed_paths:
        sys.stdout.write(f"  {path}\n")


def collect_spelling_errors(
    build_dir: Path,
    source_dir: Path,
    changed_lines: dict[str, set[int]],
    *,
    check_all_documents: bool,
) -> tuple[list[str], int]:
    """Return spelling errors and ignored-error count for the selected scope."""
    if check_all_documents:
        return spelling_errors(build_dir, source_dir), 0

    return spelling_errors_on_changed_lines(build_dir, source_dir, changed_lines)


def report_spelling_errors(errors: list[str], *, check_all_documents: bool) -> None:
    """Print spelling errors using wording that matches the selected scope."""
    if check_all_documents:
        sys.stdout.write("Spelling errors found in text documents:\n")
    else:
        sys.stdout.write("Spelling errors found in changed text-document lines:\n")

    for error in errors:
        sys.stdout.write(f"{error}\n")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run Sphinx spelling checks for changed text-document content."
    )
    parser.add_argument("--base", help="Base git revision for CI or branch comparisons.")
    parser.add_argument("--head", help="Head git revision for CI or branch comparisons.")
    parser.add_argument(
        "--staged",
        action="store_true",
        help="Check staged changes against HEAD; intended for the manual pre-commit hook.",
    )
    args = parser.parse_args()

    git_diff_args = diff_args(args)
    changed_lines = changed_text_document_lines(git_diff_args)
    changed_paths = sorted(path for path, lines in changed_lines.items() if lines)
    support_paths = changed_support_files(git_diff_args)
    check_all_documents = bool(support_paths)

    if not changed_paths and not support_paths:
        sys.stdout.write("No changed text-document lines; skipping Sphinx spelling builder.\n")
        return 0

    if not check_spelling_backend():
        return 1

    spelling_paths = spelling_paths_for_run(changed_paths, support_paths)
    report_spelling_scope(changed_paths, support_paths)

    with TemporaryDirectory() as source, TemporaryDirectory() as build:
        source_dir = Path(source)
        build_dir = Path(build)
        spelling_docs = write_spelling_source(
            source_dir,
            spelling_paths,
            staged=args.staged,
        )
        sphinx_returncode = run_sphinx(source_dir, build_dir, spelling_docs)
        errors, ignored = collect_spelling_errors(
            build_dir,
            source_dir,
            changed_lines,
            check_all_documents=check_all_documents,
        )

    if errors:
        report_spelling_errors(errors, check_all_documents=check_all_documents)
        return 1

    if ignored:
        sys.stdout.write(f"Ignored {ignored} spelling error(s) outside changed lines.\n")

    return sphinx_returncode


if __name__ == "__main__":
    sys.exit(main())
