# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Generate a GitHub token at https://github.com/settings/tokens
# Invoke this script using something like:
# python scripts/milestone_check.py

import os
import subprocess
import sys

import requests

ranges = {
    "0.35": "origin/0.35.0 --not origin/0.34.x",
    "0.35.x": "origin/0.35.x --not v0.35.0",
    "1.0": "origin/1.0.x --not origin/0.35.x",
    "1.1": "v1.1.0 --not origin/1.0.x",
    "1.1.1": "v1.1.1 --not v1.1.0",
    "1.1.2": "v1.1.2 --not v1.1.1",
    "1.1.3": "v1.1.3 --not v1.1.2",
    "1.2": "origin/1.x --not origin/1.1.x",
    "2.0": "v2.0.0 --not origin/1.x",
    "2.0.1": "v2.0.1 --not v2.0.0",
    "2.0.2": "origin/2.0.x --not v2.0.1",
    "2.1": "origin/2.1.x --not origin/2.0.x",
    "2.2": "origin/2.2.x --not origin/2.1.x",
    # 6507205805 is a commit in the debugger ancestor tree before merging
    "3.0": "origin/main ^origin/2.2.x ^6507205805",
}

try:
    api_token = os.environ["GITHUB_TOKEN"]
except KeyError:
    print(
        "Error: set the environment variable GITHUB_TOKEN to a GitHub authentication token (see https://github.com/settings/tokens)"
    )
    sys.exit(1)

if len(sys.argv) != 2:  # noqa
    print("Error: exactly one argument expected, the milestone.")
    sys.exit(1)

MILESTONE = sys.argv[1]

if MILESTONE not in ranges:
    print(
        f"Error: I do not know about milestone {MILESTONE!r}. Possible milestones are {list(ranges.keys())!r}"
    )
    sys.exit(1)


out = subprocess.run(  # noqa S602
    f"git log {ranges[MILESTONE]} --format='%H,%cE,%s'",
    shell=True,
    encoding="utf8",
    stdout=subprocess.PIPE,
    check=True,
)
commits = {i[0]: (i[1], i[2]) for i in (x.split(",", 2) for x in out.stdout.splitlines())}


url = "https://api.github.com/graphql"
json = {
    "query": """
query test($cursor: String) {
  search(first: 50, after: $cursor, type: ISSUE, query: "repo:jupyterlab/jupyterlab milestone:%s is:pr is:merged ") {
    issueCount
    pageInfo {
      endCursor
      hasNextPage
    }
    nodes {
      ... on PullRequest {
        title
        number
        mergeCommit {
          oid
        }
        commits(first: 100) {
          totalCount
          nodes {
            commit {
              oid
            }
          }
        }
      }
    }
  }
}
"""
    % MILESTONE,
    "variables": {"cursor": None},
}


headers = {"Authorization": f"token {api_token}"}
# construct a commit to PR dictionary
prs = {}
large_prs = []
cursor = None
while True:
    json["variables"]["cursor"] = cursor
    r = requests.post(url=url, json=json, headers=headers, timeout=120)
    results = r.json()["data"]["search"]
    total_prs = results["issueCount"]

    pr_list = results["nodes"]
    for pr in pr_list:
        if pr["commits"]["totalCount"] > 100:  # noqa
            large_prs.append(pr["number"])
            continue
            # TODO fetch commits
        prs[pr["number"]] = {
            "mergeCommit": pr["mergeCommit"]["oid"],
            "commits": {i["commit"]["oid"] for i in pr["commits"]["nodes"]},
        }

    has_next_page = results["pageInfo"]["hasNextPage"]
    cursor = results["pageInfo"]["endCursor"]

    if not has_next_page:
        break

prjson = {
    "query": """
query test($pr:Int!, $cursor: String) {
  repository(owner: "jupyterlab", name: "jupyterlab") {
    pullRequest(number: $pr) {
      title
      number
      mergeCommit {
        oid
      }
      commits(first: 100, after: $cursor) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          commit {
            oid
          }
        }
      }
    }
  }
}
""",
    "variables": {"pr": None, "cursor": None},
}

for prnumber in large_prs:
    prjson["variables"]["pr"] = prnumber
    pr_commits = set()
    while True:
        r = requests.post(url=url, json=prjson, headers=headers, timeout=120)
        pr = r.json()["data"]["repository"]["pullRequest"]
        assert pr["number"] == prnumber  # noqa
        total_commits = pr["commits"]["totalCount"]
        pr_commits.update(i["commit"]["oid"] for i in pr["commits"]["nodes"])
        has_next_page = results["pageInfo"]["hasNextPage"]
        cursor = results["pageInfo"]["endCursor"]

        if not pr["commits"]["pageInfo"]["hasNextPage"]:
            break
        prjson["variables"]["cursor"] = pr["commits"]["pageInfo"]["endCursor"]

    prs[prnumber] = {"mergeCommit": pr["mergeCommit"]["oid"], "commits": pr_commits}
    if total_commits > len(pr_commits):
        oid = pr["mergeCommit"]["oid"]
        print(
            f"WARNING: PR {prnumber} (merge {oid}) has {total_commits} commits, but GitHub is only giving us {len(pr_commits)} of them"
        )


# Check we got all PRs
assert len(prs) == total_prs  # noqa

# Reverse dictionary
commits_to_prs = {}
for key, value in prs.items():
    commits_to_prs[value["mergeCommit"]] = key
    for c in value["commits"]:
        commits_to_prs[c] = key

# Check to see if commits in the repo are represented in PRs
good = set()
notfound = set()
for c in commits:
    if c in commits_to_prs:
        good.add(commits_to_prs[c])
    else:
        notfound.add(c)

prs_not_represented = set(prs.keys()) - good

print(f"Milestone: {MILESTONE}, {total_prs} merged PRs, {len(commits)} commits in history")

print()
print("-" * 40)
print()

if len(prs_not_represented) > 0:
    print(
        """
PRs that are in the milestone, but have no commits in the version range.
These PRs probably belong in a different milestone.
"""
    )
    print(
        "\n".join(f"https://github.com/jupyterlab/jupyterlab/pull/{i}" for i in prs_not_represented)
    )
else:
    print(
        "Congratulations! All PRs in this milestone have commits in the commit history for this version range, so they all probably belong in this milestone."
    )

print()
print("-" * 40)
print()

if notfound:
    print(
        """The following commits are not included in any PR on this milestone.
This probably means the commit's PR needs to be assigned to this milestone,
or the commit was pushed to main directly.
"""
    )
    print("\n".join(f"{c} {commits[c][0]} {commits[c][1]}" for c in notfound))
    prs_to_check = [
        c
        for c in notfound
        if "Merge pull request #" in commits[c][1] and commits[c][0] == "noreply@github.com"
    ]
    if len(prs_to_check) > 0:
        print()
        print(
            "Try checking these PRs. They probably should be in the milestone, but probably aren't:"
        )
        print()
        print("\n".join(f"{c} {commits[c][1]}" for c in prs_to_check))
else:
    print(
        "Congratulations! All commits in the commit history are included in some PR in this milestone."
    )
