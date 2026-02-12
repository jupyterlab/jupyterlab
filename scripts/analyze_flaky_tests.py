#!/usr/bin/env python3
"""
Script to analyze Galata test runs and identify flaky tests via GitHub CLI.
Usage: ./scripts/analyze_flaky_tests.py [number_of_runs] [--commit SHA] [--since YYYY-MM-DD]
"""

import argparse
import json
import re
import subprocess
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Set


@dataclass
class TestResult:
    """Represents test results across all runs"""

    hard_failures: Set[str]  # Run IDs where test failed both attempts (0/2)
    flaky: Set[str]  # Run IDs where test failed once, passed on retry (1/2)

    def total_runs(self) -> int:
        """Total number of runs where this test appeared"""
        return len(self.hard_failures) + len(self.flaky)

    def total_attempts(self, total_runs: int) -> int:
        """Total test attempts across all runs"""
        hard = len(self.hard_failures) * 2  # 2 attempts each
        flaky = len(self.flaky) * 2  # 2 attempts each
        success = (total_runs - len(self.hard_failures) - len(self.flaky)) * 1  # 1 attempt each
        return hard + flaky + success

    def total_successes(self, total_runs: int) -> int:
        """Total successful attempts across all runs"""
        flaky = len(self.flaky) * 1  # 1 success each
        success = (total_runs - len(self.hard_failures) - len(self.flaky)) * 1  # 1 success each
        return flaky + success

    def failure_rate(self, total_runs: int) -> float:
        """Calculate failure rate as percentage"""
        attempts = self.total_attempts(total_runs)
        if attempts == 0:
            return 0.0
        successes = self.total_successes(total_runs)
        failures = attempts - successes
        return (failures / attempts) * 100


def run_command(cmd: List[str]) -> str:
    """Run a shell command and return output"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {' '.join(cmd)}")
        print(f"Error: {e.stderr}")
        return ""


def get_repo_info() -> tuple[str, str]:
    """Get repository owner and name"""
    data = json.loads(run_command(["gh", "repo", "view", "--json", "owner,name"]))
    return data["owner"]["login"], data["name"]


def run_contains_commit(owner: str, name: str, commit: str, head_sha: str) -> bool:
    """Check if a run's head commit is a descendant of (or equal to) the given commit"""
    cmd = [
        "gh",
        "api",
        f"repos/{owner}/{name}/compare/{commit}...{head_sha}",
        "--jq",
        ".status",
    ]
    status = run_command(cmd)
    return status in ("ahead", "identical")


def get_commit_date(owner: str, name: str, commit: str) -> str:
    """Get the date of a commit in YYYY-MM-DD format"""
    cmd = [
        "gh",
        "api",
        f"repos/{owner}/{name}/commits/{commit}",
        "--jq",
        ".commit.committer.date",
    ]
    date_str = run_command(cmd)
    return date_str.split("T")[0]


def get_workflow_runs(
    num_runs: int,
    commit: str | None = None,
    since: str | None = None,
    owner: str = "",
    name: str = "",
) -> List[Dict]:
    """Fetch recent workflow runs via REST API (includes node_id for GraphQL).

    Uses gh api directly instead of gh run list to get node_id, which enables
    efficient batch GraphQL queries for check run data.
    """
    print(f"Fetching the last {num_runs} Galata workflow runs...")

    all_runs: list[dict] = []
    page = 1

    while len(all_runs) < num_runs:
        per_page = min(100, num_runs - len(all_runs))
        url = (
            f"repos/{owner}/{name}/actions/workflows/galata.yml/runs"
            f"?branch=main&status=completed&per_page={per_page}&page={page}"
        )
        if since:
            url += f"&created=>={since}"

        output = run_command(["gh", "api", url])
        if not output:
            break

        data = json.loads(output)
        runs = data.get("workflow_runs", [])
        if not runs:
            break

        for r in runs:
            if len(all_runs) >= num_runs:
                break
            if r["conclusion"] in ("success", "failure"):
                all_runs.append(
                    {
                        "databaseId": r["id"],
                        "nodeId": r["node_id"],
                        "conclusion": r["conclusion"],
                        "createdAt": r["created_at"],
                        "headSha": r["head_sha"],
                        "displayTitle": r.get("display_title", ""),
                        "event": r.get("event", ""),
                        "headBranch": r.get("head_branch", ""),
                        "url": r.get("html_url", ""),
                    }
                )

        page += 1

    if commit:
        print(f"Filtering to runs containing commit {commit}...")
        all_runs = [
            run for run in all_runs if run_contains_commit(owner, name, commit, run["headSha"])
        ]

    print(f"Found {len(all_runs)} completed runs\n")
    return all_runs


def strip_line_numbers(test_name: str) -> str:
    """Remove line numbers from test file paths"""
    # Remove :114:11 style line numbers
    return re.sub(r"\.test\.ts:\d+:\d+", ".test.ts", test_name)


def parse_playwright_summary(summary: str) -> tuple[List[str], List[str]]:
    """Parse Playwright summary to extract failed and flaky tests"""
    failed_tests = []
    flaky_tests = []

    lines = summary.split("\n")
    in_failed = False
    in_flaky = False

    for line in lines:
        # Check for section headers
        if re.match(r"^\s*\d+\s+failed\s*$", line):
            in_failed = True
            in_flaky = False
            continue
        elif re.match(r"^\s*\d+\s+flaky\s*$", line):
            in_flaky = True
            in_failed = False
            continue
        elif re.match(r"^\s*\d+\s+(passed|skipped)", line):
            in_failed = False
            in_flaky = False
            continue

        # Extract test lines
        if (in_failed or in_flaky) and r"› " in line and ".test.ts" in line:
            test_name = strip_line_numbers(line.strip())
            if in_failed:
                failed_tests.append(test_name)
            else:
                flaky_tests.append(test_name)

    return failed_tests, flaky_tests


def _extract_check_run_data(check_runs: list[dict]) -> dict:
    """Extract Playwright summary and failed jobs from a list of check run nodes."""
    summary = None
    failed_jobs = []

    for cr in check_runs:
        cr_name = cr.get("name", "")
        # GraphQL uses uppercase enum values for conclusion
        if cr.get("conclusion") == "FAILURE":
            failed_jobs.append(cr_name)

        if "Merge" in cr_name and "Report" in cr_name:
            for ann in cr.get("annotations", {}).get("nodes", []):
                if ann.get("title") == "🎭 Playwright Run Summary":
                    summary = ann.get("message", "")
                    break

    return {"summary": summary, "failed_jobs": failed_jobs}


def batch_fetch_check_data(runs: list[dict]) -> dict[str, dict]:
    """Batch-fetch check run data for all runs via GraphQL.

    Uses the node_id from each run to directly query WorkflowRun -> CheckSuite,
    avoiding the need to enumerate all check suites on a commit.

    Returns dict mapping run databaseId (str) -> {
        "summary": str | None (Playwright Run Summary message),
        "failed_jobs": list[str] (names of failed check runs),
    }
    """
    results: dict[str, dict] = {}
    batch_size = 25

    # Inline fragment for WorkflowRun check suite data
    check_fields = (
        "... on WorkflowRun { databaseId checkSuite {"
        " checkRuns(first: 20) { nodes {"
        " name conclusion"
        " annotations(first: 10) { nodes { title message } }"
        " } } } }"
    )

    for i in range(0, len(runs), batch_size):
        batch = runs[i : i + batch_size]
        aliases = " ".join(
            f'run_{idx}: node(id: "{run["nodeId"]}") {{ {check_fields} }}'
            for idx, run in enumerate(batch)
        )
        query = f"{{ {aliases} }}"

        output = run_command(["gh", "api", "graphql", "-f", f"query={query}"])
        if not output:
            continue

        data = json.loads(output)
        if "errors" in data:
            for err in data["errors"]:
                print(f"  GraphQL error: {err.get('message', err)}")

        gql_data = data.get("data", {})

        for idx, batch_run in enumerate(batch):
            node = gql_data.get(f"run_{idx}")
            if not node or not node.get("checkSuite"):
                continue

            run_id = str(batch_run["databaseId"])
            check_runs = node["checkSuite"].get("checkRuns", {}).get("nodes", [])
            results[run_id] = _extract_check_run_data(check_runs)

    return results


def analyze_runs(runs: list[dict], check_data: dict[str, dict]) -> dict[str, TestResult]:
    """Analyze all runs using pre-fetched GraphQL data"""
    test_results = defaultdict(lambda: TestResult(set(), set()))

    for idx, run in enumerate(runs, 1):
        run_id = str(run["databaseId"])
        conclusion = run["conclusion"]
        created_at = run["createdAt"].split("T")[0]
        head_sha = run["headSha"][:7]
        title = run.get("displayTitle", "")
        event = run.get("event", "")
        branch = run.get("headBranch", "")
        url = run.get("url", "")

        print(f"[{idx}/{len(runs)}] Run {run_id} ({created_at}, {head_sha}) - {conclusion}")
        print(f"  {event} on {branch}: {title}")
        print(f"  {url}")

        data = check_data.get(run_id)
        if not data:
            print("  No check data found")
            print()
            continue

        if data["failed_jobs"]:
            print(f"  Failed jobs: {', '.join(data['failed_jobs'])}")

        summary = data.get("summary")
        if summary:
            failed_tests, flaky_tests = parse_playwright_summary(summary)

            for test in failed_tests:
                test_results[test].hard_failures.add(run_id)

            for test in flaky_tests:
                test_results[test].flaky.add(run_id)

            if failed_tests or flaky_tests:
                print(f"  Summary: {len(failed_tests)} failed, {len(flaky_tests)} flaky")
        else:
            print("  No Playwright summary found")

        print()

    return dict(test_results)


def print_results(test_results: Dict[str, TestResult], total_runs: int):
    """Print analysis results"""
    print("=" * 80)
    print("Test Failure Analysis")
    print("=" * 80)
    print()

    # Calculate failure rates and sort
    test_scores = []
    for test_name, result in test_results.items():
        failure_rate = result.failure_rate(total_runs)
        test_scores.append((failure_rate, result, test_name))

    test_scores.sort(reverse=True, key=lambda x: x[0])

    # Print top tests by failure rate
    print("Top 20 Tests by Overall Failure Rate:")
    print("=" * 80)
    print("(Hard: 0/2, Flaky: 1/2, Success: 1/1 per run)")
    print()

    for failure_rate, result, test_name in test_scores[:20]:
        attempts = result.total_attempts(total_runs)
        failures = attempts - result.total_successes(total_runs)
        hard_count = len(result.hard_failures)
        flaky_count = len(result.flaky)
        success_count = total_runs - hard_count - flaky_count

        print(f"[{failures}/{attempts} attempts = {failure_rate:.1f}% failure] {test_name}")
        print(
            f"  Hard failures: {hard_count} runs (0/2), Flaky: {flaky_count} runs (1/2), Success: {success_count} runs (1/1)"
        )

        if result.hard_failures:
            print(f"  Hard failed in runs: {' '.join(sorted(result.hard_failures))}")
        if result.flaky:
            print(f"  Flaky in runs: {' '.join(sorted(result.flaky))}")
        print()

    print()
    print("=" * 80)
    print()

    # Print hard failures only
    hard_only = [(len(r.hard_failures), t, r) for t, r in test_results.items() if r.hard_failures]
    hard_only.sort(reverse=True)

    print("Top 20 Most Failed Tests (Hard Failures Only):")
    print("=" * 80)
    print()

    for count, test_name, result in hard_only[:20]:
        percentage = (count / total_runs) * 100
        print(f"[{count}/{total_runs} runs = {percentage:.1f}%] {test_name}")
        print(f"  Failed in runs: {' '.join(sorted(result.hard_failures))}")
        print()

    print(f"Total unique hard-failing tests: {len(hard_only)}")
    print(f"Total hard failures: {sum(len(r.hard_failures) for r in test_results.values())}")
    print()
    print("=" * 80)
    print()

    # Print flaky tests only
    flaky_only = [(len(r.flaky), t, r) for t, r in test_results.items() if r.flaky]
    flaky_only.sort(reverse=True)

    print("Top 20 Most Flaky Tests (Passed on Retry Only):")
    print("=" * 80)
    print()

    for count, test_name, result in flaky_only[:20]:
        percentage = (count / total_runs) * 100
        print(f"[{count}/{total_runs} runs = {percentage:.1f}%] {test_name}")
        print(f"  Flaky in runs: {' '.join(sorted(result.flaky))}")
        print()

    print(f"Total unique flaky tests: {len(flaky_only)}")
    print(f"Total flaky occurrences: {sum(len(r.flaky) for r in test_results.values())}")
    print()
    print("=" * 80)
    print()
    print("To view details of a specific run:")
    print("  gh run view <RUN_ID> --log-failed")
    print()
    print("To see all runs:")
    print("  gh run list --workflow=galata.yml --branch=main")
    print()


def main():
    parser = argparse.ArgumentParser(description="Analyze Galata test runs for flaky tests")
    parser.add_argument(
        "num_runs", nargs="?", type=int, default=100, help="Number of runs to analyze"
    )
    parser.add_argument(
        "--commit", type=str, default=None, help="Only consider runs containing this commit"
    )
    parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="Only consider runs created on or after this date (YYYY-MM-DD). Defaults to commit date if --commit is used.",
    )
    args = parser.parse_args()

    num_runs = args.num_runs
    commit = args.commit
    since = args.since

    owner, name = get_repo_info()

    if commit and not since:
        since = get_commit_date(owner, name, commit)
        print(f"Using commit date {since} as --since default")

    if commit:
        print(f"Analyzing runs containing commit {commit} (since {since})...")
    elif since:
        print(f"Analyzing runs since {since}...")
    else:
        print(f"Analyzing the last {num_runs} Galata workflow runs for flaky tests...")
    print("=" * 80)
    print()

    runs = get_workflow_runs(num_runs, commit, since, owner, name)

    # Batch-fetch all check data via GraphQL (replaces 2N REST calls)
    print(f"Fetching check data for {len(runs)} runs via GraphQL...")
    check_data = batch_fetch_check_data(runs)
    print(f"Retrieved data for {len(check_data)} runs\n")

    test_results = analyze_runs(runs, check_data)
    print_results(test_results, len(runs))


if __name__ == "__main__":
    main()
