# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

#!/usr/bin/env python3
"""
Process Playwright test reports and unpack snapshots to their correct locations.

This script reads JSON test reports from Playwright's JSON reporter and extracts
snapshot files from the test-results directory, placing them in the correct
snapshot directories based on the test file locations.

Format:
    python scripts/unpack_snapshots.py [test_assets_dir] [--dry-run]
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

SNAPSHOT_EXTENSIONS = (".png", ".json")


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Process Playwright test reports and unpack snapshots"
    )
    parser.add_argument(
        "test_assets_dir",
        nargs="?",
        type=Path,
        default=Path("galata/test-results"),
        help="Path to the downloaded artifact directory (positional)",
    )
    parser.add_argument(
        "-d",
        "--dry-run",
        action="store_true",
        help="Print what would be done without making changes",
    )
    return parser.parse_args()


def parse_json_report(json_file: Path) -> dict:
    """Parse a JSON test report file."""
    try:
        with open(json_file) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        sys.stderr.write(f"Error parsing JSON file {json_file}: {e}\n")
        return {}


def to_repo_relative(path_value: str, root_dir: str | None) -> Path:
    """Convert an absolute/relative report path to a path relative to repository root."""
    if not path_value:
        return Path()

    path = Path(path_value)

    if root_dir and path_value.startswith(root_dir.rstrip("/") + "/"):
        rel = path_value[len(root_dir.rstrip("/")) + 1 :]
        root_name = Path(root_dir.rstrip("/")).name
        if root_name:
            return Path(root_name) / Path(rel)
        return Path(rel)

    if path.is_absolute():
        parts = path.parts
        if "galata" in parts:
            index = parts.index("galata")
            return Path(*parts[index:])
        return Path(path.name)

    return path


def to_artifact_source_path(source_relative: Path, artifact_dir: Path, report_dir: Path) -> Path:
    """Map a report source path to the downloaded artifact directory."""
    parts = source_relative.parts
    prefix = ("galata", "test-results")

    for index, part in enumerate(parts):
        if part == "test-results":
            candidate = report_dir / Path(*parts[index + 1 :])
            if candidate.exists():
                return candidate

    for index in range(max(0, len(parts) - len(prefix) + 1)):
        if parts[index : index + len(prefix)] == prefix:
            return artifact_dir / Path(*parts[index + len(prefix) :])

    return artifact_dir / source_relative


def get_report_repo_dir(json_file: Path, artifact_dir: Path) -> Path | None:
    """Infer the repository directory containing a nested Playwright report."""
    try:
        report_parent = json_file.parent.relative_to(artifact_dir)
    except ValueError:
        return None

    parts = report_parent.parts
    if not parts or "test-results" not in parts:
        return None

    index = parts.index("test-results")
    if index == 0:
        return None

    return Path(*parts[:index])


def to_destination_path(
    expected_path: str, root_dir: str | None, report_repo_dir: Path | None
) -> Path:
    """Map an expected snapshot attachment path to a repository destination."""
    dest_relative = to_repo_relative(expected_path, root_dir)
    if report_repo_dir is None:
        return dest_relative

    parts = dest_relative.parts
    root_name = Path(root_dir.rstrip("/")).name if root_dir else ""
    if root_name and parts and parts[0] == root_name:
        parts = parts[1:]

    repo_parts = report_repo_dir.parts
    if parts[: len(repo_parts)] == repo_parts:
        return Path(*parts)

    return report_repo_dir / Path(*parts)


def collect_snapshot_attachments(
    attachments: list[dict],
) -> tuple[dict[str, dict], dict[str, dict]]:
    """Collect expected and actual snapshot attachments keyed by base name."""
    expected_by_base: dict[str, dict] = {}
    actual_by_base: dict[str, dict] = {}

    for attachment in attachments:
        name = attachment.get("name", "")
        path_value = attachment.get("path", "")

        if not path_value:
            continue

        for extension in SNAPSHOT_EXTENSIONS:
            expected_suffix = f"-expected{extension}"
            if name.endswith(expected_suffix):
                expected_by_base[name[: -len(expected_suffix)]] = attachment
                break

            actual_suffix = f"-actual{extension}"
            if name.endswith(actual_suffix):
                actual_by_base[name[: -len(actual_suffix)]] = attachment
                break

    return expected_by_base, actual_by_base


def process_result(
    result: dict,
    artifact_dir: Path,
    report_dir: Path,
    report_repo_dir: Path | None,
    root_dir: str | None,
    dry_run: bool = False,
) -> int:
    """Process failed test result attachments by copying actual snapshots to expected paths."""
    if result.get("status") != "failed":
        return 0

    attachments = result.get("attachments", [])
    expected_by_base, actual_by_base = collect_snapshot_attachments(attachments)

    copied = 0
    for base_name, actual in actual_by_base.items():
        expected = expected_by_base.get(base_name)
        if expected is None:
            sys.stderr.write(f"Warning: Missing expected snapshot attachment for '{base_name}'\n")
            continue

        source_relative = to_repo_relative(actual["path"], root_dir)
        source_path = to_artifact_source_path(source_relative, artifact_dir, report_dir)
        if not source_path.exists():
            sys.stderr.write(
                f"Warning: Could not locate actual snapshot in artifact: {actual['path']}\n"
            )
            continue

        dest_relative = to_destination_path(expected["path"], root_dir, report_repo_dir)
        dest_path = Path.cwd() / dest_relative

        if dry_run:
            sys.stdout.write(f"Would copy: {source_path} -> {dest_relative}\n")
            copied += 1
            continue

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, dest_path)
        sys.stdout.write(f"Copied: {source_path} -> {dest_relative}\n")
        copied += 1

    return copied


def process_report(report: dict, artifact_dir: Path, json_file: Path, dry_run: bool = False) -> int:
    """
    Process a complete test report.

    Returns the total number of snapshots processed.
    """
    total = 0
    root_dir = report.get("config", {}).get("rootDir")
    report_dir = json_file.parent
    report_repo_dir = get_report_repo_dir(json_file, artifact_dir)

    def walk_suites(suites: list[dict]) -> int:
        count = 0
        for suite in suites:
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    for result in test.get("results", []):
                        count += process_result(
                            result,
                            artifact_dir,
                            report_dir,
                            report_repo_dir,
                            root_dir,
                            dry_run,
                        )
            count += walk_suites(suite.get("suites", []))
        return count

    total = walk_suites(report.get("suites", []))

    return total


def is_playwright_report(report: dict) -> bool:
    """Return True if parsed JSON looks like a Playwright JSON report."""
    return isinstance(report, dict) and isinstance(report.get("suites"), list)


def main() -> int:
    """Main entry point."""
    args = parse_arguments()

    # Validate input directory
    if not args.test_assets_dir.exists():
        sys.stdout.write(f"Error: Test results directory does not exist: {args.test_assets_dir}\n")
        sys.exit(1)

    # Find JSON reports in the test results directory.
    # Hidden files (e.g. .last-run.json) are metadata and not Playwright report files.
    json_files = [
        path
        for path in args.test_assets_dir.rglob("*.json")
        if not any(part.startswith(".") for part in path.relative_to(args.test_assets_dir).parts)
    ]

    if not json_files:
        sys.stdout.write(f"No JSON report files found in {args.test_assets_dir}")
        return 0

    sys.stdout.write(f"Found {len(json_files)} JSON report file(s)")

    total_snapshots = 0
    for json_file in json_files:
        sys.stdout.write(f"\nProcessing: {json_file}\n")
        report = parse_json_report(json_file)

        if not is_playwright_report(report):
            sys.stdout.write("  Skipping: not a Playwright JSON report\n")
            continue

        count = process_report(report, args.test_assets_dir, json_file, args.dry_run)
        total_snapshots += count
        sys.stdout.write(f"  Processed {count} snapshots from this report\n")

    sys.stdout.write(f"\nTotal snapshots processed: {total_snapshots}\n")

    if args.dry_run:
        sys.stdout.write("\n(This was a dry run - no files were actually modified)\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
