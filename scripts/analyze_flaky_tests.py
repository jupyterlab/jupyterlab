#!/usr/bin/env python3
"""
Script to analyze Galata test runs and identify flaky tests via GitHub CLI.
Usage: ./scripts/analyze_flaky_tests.py [number_of_runs]
"""

import json
import re
import subprocess
import sys
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
    owner = json.loads(run_command(["gh", "repo", "view", "--json", "owner"]))["owner"]["login"]
    name = json.loads(run_command(["gh", "repo", "view", "--json", "name"]))["name"]
    return owner, name


def get_workflow_runs(num_runs: int) -> List[Dict]:
    """Fetch recent workflow runs"""
    print(f"Fetching the last {num_runs} Galata workflow runs...")
    cmd = [
        "gh",
        "run",
        "list",
        "--workflow=galata.yml",
        "--branch=main",
        f"--limit={num_runs}",
        "--json",
        "databaseId,status,conclusion,createdAt,headSha",
    ]
    output = run_command(cmd)
    runs = json.loads(output)

    # Filter for completed runs with success or failure
    completed_runs = [
        r for r in runs if r["status"] == "completed" and r["conclusion"] in ["success", "failure"]
    ]

    print(f"Found {len(completed_runs)} completed runs\n")
    return completed_runs


def strip_line_numbers(test_name: str) -> str:
    """Remove line numbers from test file paths"""
    # Remove :114:11 style line numbers
    return re.sub(r"\.test\.ts:\d+:\d+", ".test.ts", test_name)


def get_playwright_summary(owner: str, name: str, check_run_id: str) -> str:
    """Get the Playwright Run Summary annotation for a check run"""
    cmd = [
        "gh",
        "api",
        f"repos/{owner}/{name}/check-runs/{check_run_id}/annotations",
        "--jq",
        '.[] | select(.title == "🎭 Playwright Run Summary") | .message',
    ]
    return run_command(cmd)


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


def analyze_runs(owner: str, name: str, runs: List[Dict]) -> Dict[str, TestResult]:
    """Analyze all runs and collect test results"""
    test_results = defaultdict(lambda: TestResult(set(), set()))

    for idx, run in enumerate(runs, 1):
        run_id = str(run["databaseId"])
        conclusion = run["conclusion"]
        created_at = run["createdAt"].split("T")[0]
        head_sha = run["headSha"][:7]

        print(f"[{idx}/{len(runs)}] Run {run_id} ({created_at}, {head_sha}) - {conclusion}")

        # Get jobs for this run
        jobs_cmd = ["gh", "run", "view", run_id, "--json", "jobs"]
        jobs_output = run_command(jobs_cmd)
        if not jobs_output:
            continue

        jobs_data = json.loads(jobs_output)

        # Process Visual Regression and Documentation jobs
        for job in jobs_data.get("jobs", []):
            job_name = job.get("name", "")
            if "Visual Regression" not in job_name and "Documentation" not in job_name:
                continue

            job_conclusion = job.get("conclusion", "")
            job_db_id = str(job.get("databaseId", ""))

            if job_conclusion == "failure":
                print(f"  ✗ {job_name} failed")

                # Get Playwright summary
                summary = get_playwright_summary(owner, name, job_db_id)
                if summary:
                    failed_tests, flaky_tests = parse_playwright_summary(summary)

                    for test in failed_tests:
                        test_results[test].hard_failures.add(run_id)

                    for test in flaky_tests:
                        test_results[test].flaky.add(run_id)
            else:
                print(f"  ✓ {job_name} passed")

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
    num_runs = int(sys.argv[1]) if len(sys.argv) > 1 else 100

    print(f"Analyzing the last {num_runs} Galata workflow runs for flaky tests...")
    print("=" * 80)
    print()

    owner, name = get_repo_info()
    runs = get_workflow_runs(num_runs)

    test_results = analyze_runs(owner, name, runs)
    print_results(test_results, len(runs))


if __name__ == "__main__":
    main()
