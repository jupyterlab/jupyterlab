# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
"""Analyze recent Galata workflow runs for hard-failing and flaky tests."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_ROOT = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"
PER_PAGE = 100
REQUEST_TIMEOUT = 60
TOP_LIMIT = 20
SOURCE_OWNER = "jupyterlab"
SOURCE_REPO_NAME = "jupyterlab"
SOURCE_REPOSITORY = f"{SOURCE_OWNER}/{SOURCE_REPO_NAME}"
SOURCE_WORKFLOW = "galata.yml"
SOURCE_BRANCH = "main"
SOURCE_EVENT = "schedule"
MERGE_CHECK_NAME = "Merge Test Reports and Results"
SUMMARY_TITLE = "Playwright Run Summary"
PLAYWRIGHT_SEPARATOR = "\u203a"
COMPLETED_CONCLUSIONS = {"success", "failure"}

PROJECT_TO_BROWSER = {
    "documentation": "chromium",
    "galata": "chromium",
    "csp": "chromium",
    "jupyterlab": "chromium",
    "jupyterlab-firefox": "firefox",
}

SECTION_RE = re.compile(r"^\s*\d+\s+(failed|flaky|passed|skipped)\b")
PROJECT_RE = re.compile(r"^\[([^\]]+)\]\s*" + PLAYWRIGHT_SEPARATOR + r"\s*")
LINE_NUMBER_RE = re.compile(r"(\.(?:test|spec)\.ts):\d+:\d+")
TEST_FILE_RE = re.compile(r"\.(?:test|spec)\.ts")
TRAILING_SEPARATOR_RE = re.compile(r"\s+\u2500+$")


@dataclass(frozen=True)
class TestOccurrence:
    """A single failed or flaky test occurrence in one browser/project."""

    name: str
    browser: str


@dataclass
class RunResult:
    """Parsed result for one UI Tests workflow run."""

    run_id: int
    created_at: str
    conclusion: str
    head_sha: str
    url: str
    failed: list[TestOccurrence] = field(default_factory=list)
    flaky: list[TestOccurrence] = field(default_factory=list)
    has_summary: bool = False


@dataclass
class TestSummary:
    """Aggregated occurrences for one test."""

    name: str
    occurrences: int = 0
    runs: set[int] = field(default_factory=set)
    browsers: Counter[str] = field(default_factory=Counter)

    def add(self, run_id: int, browser: str) -> None:
        """Record one occurrence."""
        self.occurrences += 1
        self.runs.add(run_id)
        self.browsers[browser] += 1


class GitHubClient:
    """Small REST client for the GitHub endpoints used by this script."""

    def __init__(self, token: str | None) -> None:
        self._headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
        }
        if token:
            self._headers["Authorization"] = f"Bearer {token}"

    def get_json(self, path: str, params: dict[str, str | int] | None = None):
        """Return decoded JSON from a GitHub API path."""
        url = f"{API_ROOT}{path}"
        if params:
            url = f"{url}?{urlencode(params)}"
        request = Request(url, headers=self._headers)  # noqa: S310
        try:
            with urlopen(request, timeout=REQUEST_TIMEOUT) as response:  # noqa: S310
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            msg = f"GitHub API request failed for {path}: {exc.code} {detail}"
            raise RuntimeError(msg) from exc

    def get_paginated(
        self,
        path: str,
        *,
        key: str | None = None,
        params: dict[str, str | int] | None = None,
    ) -> list[dict]:
        """Return all items from a simple page/per_page GitHub list endpoint."""
        items: list[dict] = []
        page = 1
        while True:
            query: dict[str, str | int] = {"per_page": PER_PAGE, "page": page}
            if params:
                query.update(params)
            data = self.get_json(path, query)
            page_items = data.get(key, []) if key else data
            if not page_items:
                break
            items.extend(page_items)
            if len(page_items) < PER_PAGE:
                break
            page += 1
        return items


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "num_runs",
        nargs="?",
        type=int,
        default=30,
        help="Number of completed workflow runs to analyze.",
    )
    parser.add_argument("--json", dest="json_path", help="Write structured JSON to this path.")
    parser.add_argument("--markdown", help="Write Markdown report to this path.")
    parser.add_argument(
        "--github-output",
        help="Append summary values to this GitHub Actions output file.",
    )
    args = parser.parse_args()
    if args.num_runs < 1:
        parser.error("num_runs must be a positive integer.")
    return args


def parse_github_datetime(value: str) -> datetime:
    """Parse a GitHub ISO timestamp."""
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def workflow_run_sort_key(run: dict) -> tuple[datetime, int]:
    """Return a stable newest-first sort key for workflow runs."""
    return parse_github_datetime(str(run["created_at"])), int(run["id"])


def normalize_test_name(value: str) -> str:
    """Normalize Playwright summary test names for stable grouping."""
    name = value.strip()
    name = LINE_NUMBER_RE.sub(r"\1", name)
    name = TRAILING_SEPARATOR_RE.sub("", name)
    if name.startswith("test/"):
        name = f"galata/{name}"
    return name


def parse_summary(summary: str) -> tuple[list[TestOccurrence], list[TestOccurrence]]:
    """Extract hard-failing and retry-only flaky tests from a Playwright summary."""
    failed: list[TestOccurrence] = []
    flaky: list[TestOccurrence] = []
    section: str | None = None

    for raw_line in summary.splitlines():
        line = raw_line.strip()
        section_match = SECTION_RE.match(line)
        if section_match:
            section = section_match.group(1)
            continue
        if section not in {"failed", "flaky"}:
            continue
        if PLAYWRIGHT_SEPARATOR not in line or not TEST_FILE_RE.search(line):
            continue

        browser = "unknown"
        project_match = PROJECT_RE.match(line)
        if project_match:
            project = project_match.group(1)
            browser = PROJECT_TO_BROWSER.get(project, project)
            line = line[project_match.end() :]

        occurrence = TestOccurrence(name=normalize_test_name(line), browser=browser)
        if section == "failed":
            failed.append(occurrence)
        else:
            flaky.append(occurrence)

    return failed, flaky


def get_workflow_runs(
    client: GitHubClient,
    *,
    num_runs: int,
) -> list[dict]:
    """Fetch recent completed workflow runs matching the requested filters."""
    runs: list[dict] = []
    page = 1
    path = f"/repos/{SOURCE_OWNER}/{SOURCE_REPO_NAME}/actions/workflows/{SOURCE_WORKFLOW}/runs"

    while len(runs) < num_runs:
        params = {
            "status": "completed",
            "per_page": PER_PAGE,
            "page": page,
            "branch": SOURCE_BRANCH,
            "event": SOURCE_EVENT,
        }
        data = client.get_json(path, params)
        page_runs = sorted(data.get("workflow_runs", []), key=workflow_run_sort_key, reverse=True)
        if not page_runs:
            break

        for run in page_runs:
            if run.get("conclusion") not in COMPLETED_CONCLUSIONS:
                continue
            runs.append(run)
            if len(runs) >= num_runs:
                break

        if len(page_runs) < PER_PAGE:
            break
        page += 1

    return sorted(runs, key=workflow_run_sort_key, reverse=True)[:num_runs]


def get_playwright_summary(
    client: GitHubClient,
    check_suite_id: int | None,
) -> str | None:
    """Return the Playwright summary annotation for a workflow run."""
    if check_suite_id is None:
        return None

    check_runs = client.get_paginated(
        f"/repos/{SOURCE_OWNER}/{SOURCE_REPO_NAME}/check-suites/{check_suite_id}/check-runs",
        key="check_runs",
    )
    merge_runs = sorted(
        (item for item in check_runs if item.get("name") == MERGE_CHECK_NAME),
        key=lambda item: int(item["id"]),
        reverse=True,
    )
    if not merge_runs:
        return None

    annotations = client.get_paginated(
        f"/repos/{SOURCE_OWNER}/{SOURCE_REPO_NAME}/check-runs/{merge_runs[0]['id']}/annotations"
    )
    summary_annotations = sorted(
        (
            annotation
            for annotation in annotations
            if SUMMARY_TITLE in str(annotation.get("title", "")) and annotation.get("message")
        ),
        key=lambda item: (
            str(item.get("path", "")),
            int(item.get("start_line") or 0),
            str(item.get("message", "")),
        ),
    )
    if summary_annotations:
        return str(summary_annotations[0]["message"])
    return None


def analyze_runs(
    client: GitHubClient,
    runs: list[dict],
) -> list[RunResult]:
    """Fetch and parse Playwright summaries for workflow runs."""
    results: list[RunResult] = []
    for run in runs:
        summary = get_playwright_summary(client, run.get("check_suite_id"))
        failed: list[TestOccurrence] = []
        flaky: list[TestOccurrence] = []
        if summary:
            failed, flaky = parse_summary(summary)

        results.append(
            RunResult(
                run_id=run["id"],
                created_at=run["created_at"],
                conclusion=run["conclusion"],
                head_sha=run["head_sha"],
                url=run["html_url"],
                failed=failed,
                flaky=flaky,
                has_summary=summary is not None,
            )
        )
    return results


def summarize_tests(runs: list[RunResult], attr: str) -> list[TestSummary]:
    """Aggregate failed or flaky occurrences by test name."""
    summaries: dict[str, TestSummary] = {}
    for run in runs:
        occurrences = getattr(run, attr)
        for occurrence in occurrences:
            summary = summaries.setdefault(occurrence.name, TestSummary(occurrence.name))
            summary.add(run.run_id, occurrence.browser)
    return sorted(summaries.values(), key=lambda item: (-item.occurrences, item.name))


def browser_summary(browsers: Counter[str]) -> str:
    """Format browser occurrence counts."""
    parts = [
        f"{browser} {count}"
        for browser, count in sorted(browsers.items(), key=lambda item: (-item[1], item[0]))
    ]
    return ", ".join(parts)


def markdown_cell(value: object) -> str:
    """Escape a value for a Markdown table cell."""
    escaped = html.escape(str(value), quote=False)
    return escaped.replace("|", "\\|")


def format_test_table(items: list[TestSummary], total_runs: int) -> str:
    """Format a Markdown table for aggregated test occurrences."""
    if not items:
        return "No tests found.\n"

    lines = ["| Occurrences | Browsers | Test |", "| --- | --- | --- |"]
    lines.extend(
        (
            "| "
            f"{item.occurrences}/{total_runs} | "
            f"{markdown_cell(browser_summary(item.browsers))} | "
            f"{markdown_cell(item.name)} |"
        )
        for item in items[:TOP_LIMIT]
    )
    return "\n".join(lines) + "\n"


def format_run_table(runs: list[RunResult]) -> str:
    """Format a Markdown table for analyzed workflow runs."""
    if not runs:
        return "No workflow runs matched the requested filters.\n"

    lines = ["| Run | Created | Result | Failed | Flaky |", "| --- | --- | --- | --- | --- |"]
    for run in runs:
        created = run.created_at.replace("T", " ").replace("Z", " UTC")
        run_link = f"[{run.run_id}]({run.url})"
        lines.append(
            "| "
            f"{run_link} | "
            f"{markdown_cell(created)} | "
            f"{markdown_cell(run.conclusion)} | "
            f"{len(run.failed)} | "
            f"{len(run.flaky)} |"
        )
    return "\n".join(lines) + "\n"


def get_run_window(runs: list[RunResult]) -> tuple[str, str]:
    """Return the oldest and newest analyzed run dates."""
    if not runs:
        return "n/a", "n/a"
    oldest = parse_github_datetime(runs[-1].created_at).date().isoformat()
    newest = parse_github_datetime(runs[0].created_at).date().isoformat()
    return oldest, newest


def build_report(
    runs: list[RunResult],
    hard_failures: list[TestSummary],
    flaky_tests: list[TestSummary],
) -> str:
    """Build the Markdown report."""
    total_runs = len(runs)
    hard_failure_occurrences = sum(item.occurrences for item in hard_failures)
    retry_only_flake_occurrences = sum(item.occurrences for item in flaky_tests)
    affected_tests = {item.name for item in hard_failures} | {item.name for item in flaky_tests}
    runs_without_summary = sum(1 for run in runs if not run.has_summary)
    window_start, window_end = get_run_window(runs)
    window = "n/a" if window_start == "n/a" else f"{window_start} to {window_end}"

    lines = [
        "# Galata Flakiness Report",
        "",
        f"Repository: `{SOURCE_REPOSITORY}`",
        f"Workflow: `{SOURCE_WORKFLOW}`",
        f"Filters: branch `{SOURCE_BRANCH}`, event `{SOURCE_EVENT}`",
        f"Window: {window}",
        "",
        "## Summary",
        "",
        f"- Analyzed workflow runs: {total_runs}",
        f"- Unique affected tests: {len(affected_tests)}",
        f"- Unique hard-failing tests: {len(hard_failures)}",
        f"- Unique retry-only flaky tests: {len(flaky_tests)}",
        f"- Hard-failing test occurrences: {hard_failure_occurrences}",
        f"- Retry-only flaky test occurrences: {retry_only_flake_occurrences}",
        f"- Runs without Playwright summary: {runs_without_summary}",
        "",
        "## Top Hard Failures",
        "",
        format_test_table(hard_failures, total_runs),
        "## Top Retry-Only Flakes",
        "",
        format_test_table(flaky_tests, total_runs),
        "## Analyzed Runs",
        "",
        format_run_table(runs),
    ]
    return "\n".join(lines)


def build_json_payload(
    runs: list[RunResult],
    hard_failures: list[TestSummary],
    flaky_tests: list[TestSummary],
) -> dict:
    """Build structured report data."""
    affected_tests = {item.name for item in hard_failures} | {item.name for item in flaky_tests}
    window_start, window_end = get_run_window(runs)

    def serialize_summary(item: TestSummary) -> dict:
        return {
            "test": item.name,
            "occurrences": item.occurrences,
            "runs": sorted(item.runs),
            "browsers": dict(sorted(item.browsers.items())),
        }

    return {
        "metadata": {
            "repository": SOURCE_REPOSITORY,
            "workflow": SOURCE_WORKFLOW,
            "branch": SOURCE_BRANCH,
            "event": SOURCE_EVENT,
            "analyzed_runs": len(runs),
            "window_start": window_start,
            "window_end": window_end,
        },
        "totals": {
            "unique_affected_tests": len(affected_tests),
            "unique_hard_failing_tests": len(hard_failures),
            "unique_retry_only_flaky_tests": len(flaky_tests),
            "hard_failure_occurrences": sum(item.occurrences for item in hard_failures),
            "retry_only_flake_occurrences": sum(item.occurrences for item in flaky_tests),
            "runs_without_summary": sum(1 for run in runs if not run.has_summary),
        },
        "hard_failures": [serialize_summary(item) for item in hard_failures],
        "retry_only_flakes": [serialize_summary(item) for item in flaky_tests],
        "runs": [
            {
                "id": run.run_id,
                "created_at": run.created_at,
                "conclusion": run.conclusion,
                "head_sha": run.head_sha,
                "url": run.url,
                "failed": len(run.failed),
                "flaky": len(run.flaky),
                "has_summary": run.has_summary,
            }
            for run in runs
        ],
    }


def write_outputs(path: str, payload: dict) -> None:
    """Append selected report totals to a GitHub Actions output file."""
    totals = payload["totals"]
    values = {
        "analyzed_runs": payload["metadata"]["analyzed_runs"],
        "window_start": payload["metadata"]["window_start"],
        "window_end": payload["metadata"]["window_end"],
        "unique_affected_tests": totals["unique_affected_tests"],
        "unique_hard_failing_tests": totals["unique_hard_failing_tests"],
        "unique_retry_only_flaky_tests": totals["unique_retry_only_flaky_tests"],
        "hard_failure_occurrences": totals["hard_failure_occurrences"],
        "retry_only_flake_occurrences": totals["retry_only_flake_occurrences"],
        "runs_without_summary": totals["runs_without_summary"],
    }
    with Path(path).open("a", encoding="utf-8") as fid:
        fid.writelines(f"{key}={value}\n" for key, value in values.items())


def main() -> int:
    """Run the flaky test analysis."""
    args = parse_args()
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    client = GitHubClient(token)

    runs = get_workflow_runs(
        client,
        num_runs=args.num_runs,
    )
    results = analyze_runs(client, runs)
    hard_failures = summarize_tests(results, "failed")
    flaky_tests = summarize_tests(results, "flaky")

    report = build_report(
        results,
        hard_failures,
        flaky_tests,
    )
    payload = build_json_payload(
        results,
        hard_failures,
        flaky_tests,
    )

    if args.markdown:
        Path(args.markdown).write_text(report, encoding="utf-8")
    else:
        sys.stdout.write(report)

    if args.json_path:
        json_text = json.dumps(payload, indent=2, sort_keys=True)
        Path(args.json_path).write_text(f"{json_text}\n", encoding="utf-8")

    if args.github_output:
        write_outputs(args.github_output, payload)

    return 0


if __name__ == "__main__":
    sys.exit(main())
