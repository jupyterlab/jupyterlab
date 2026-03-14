# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

#!/usr/bin/env python3
"""
Process Playwright test reports and unpack snapshots to their correct locations.

This script reads JSON test reports from Playwright's JSON reporter and extracts
snapshot images from the test-results directory, placing them in the correct
snapshot directories based on the test file locations.

Format:
    python scripts/unpack_snapshots.py [test_assets_dir] [--dry-run]
"""

import argparse
import json
import shutil
import sys
from pathlib import Path


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


def to_artifact_source_path(source_relative: Path, artifact_dir: Path) -> Path:
    """Map a report source path to the downloaded artifact directory."""
    parts = source_relative.parts
    prefix = ("galata", "test-results")

    for index in range(max(0, len(parts) - len(prefix) + 1)):
        if parts[index : index + len(prefix)] == prefix:
            return artifact_dir / Path(*parts[index + len(prefix) :])

    return artifact_dir / source_relative


def process_result(
    result: dict,
    artifact_dir: Path,
    root_dir: str | None,
    dry_run: bool = False,
) -> int:
    """Process failed test result attachments by copying actual image to expected path."""
    if result.get("status") != "failed":
        return 0

    attachments = result.get("attachments", [])
    expected_by_base: dict[str, dict] = {}
    actual_by_base: dict[str, dict] = {}

    for attachment in attachments:
        name = attachment.get("name", "")
        content_type = attachment.get("contentType", "")
        path_value = attachment.get("path", "")

        if not path_value or content_type != "image/png":
            continue

        if name.endswith("-expected.png"):
            expected_by_base[name[: -len("-expected.png")]] = attachment
        elif name.endswith("-actual.png"):
            actual_by_base[name[: -len("-actual.png")]] = attachment

    copied = 0
    for base_name, actual in actual_by_base.items():
        expected = expected_by_base.get(base_name)
        if expected is None:
            continue

        source_relative = to_repo_relative(actual["path"], root_dir)
        source_path = to_artifact_source_path(source_relative, artifact_dir)
        if not source_path.exists():
            sys.stderr.write(
                f"Warning: Could not locate actual image in artifact: {actual['path']}\n"
            )
            continue

        dest_relative = to_repo_relative(expected["path"], root_dir)
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


def process_report(report: dict, artifact_dir: Path, dry_run: bool = False) -> int:
    """
    Process a complete test report.

    Returns the total number of snapshots processed.
    """
    total = 0
    root_dir = report.get("config", {}).get("rootDir")

    def walk_suites(suites: list[dict]) -> int:
        count = 0
        for suite in suites:
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    for result in test.get("results", []):
                        count += process_result(result, artifact_dir, root_dir, dry_run)
            count += walk_suites(suite.get("suites", []))
        return count

    total = walk_suites(report.get("suites", []))

    return total


def is_playwright_report(report: dict) -> bool:
    """Return True if parsed JSON looks like a Playwright JSON report."""
    return isinstance(report, dict) and isinstance(report.get("suites"), list)


def main():
    """Main entry point."""
    args = parse_arguments()

    # Validate input directory
    if not args.test_assets_dir.exists():
        sys.stdout.write(f"Error: Test results directory does not exist: {args.test_assets_dir}\n")
        sys.exit(1)

    # Find JSON reports in the test results directory.
    # Hidden files (e.g. .last-run.json) are metadata and not Playwright report files.
    json_files = [
        path for path in args.test_assets_dir.glob("*.json") if not path.name.startswith(".")
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

        count = process_report(report, args.test_assets_dir, args.dry_run)
        total_snapshots += count
        sys.stdout.write(f"  Processed {count} snapshots from this report\n")

    sys.stdout.write(f"\nTotal snapshots processed: {total_snapshots}\n")

    if args.dry_run:
        sys.stdout.write("\n(This was a dry run - no files were actually modified)\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
