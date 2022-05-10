# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import argparse
import hashlib
import json
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description="Update Galata Snapshot images.")
parser.add_argument("report", help="Path to the galata-report directory")
args = parser.parse_args()


def sha1(path):
    """Calculate hashes of all png files in the test/directory"""
    with open(path, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()


filehashes = {sha1(p): p for p in Path(".").glob("**/*-snapshots/*-linux.png")}


# For every json file in data directory except report.json
data_dir = Path(args.report).expanduser().resolve() / "data"
for p in data_dir.glob("*.json"):
    if p.name == "report.json":
        continue
    with open(p, "rb") as f:
        z = json.load(f)
    for t in z["tests"]:
        if t["outcome"] != "unexpected":
            continue
        for r in t["results"]:
            for attachment in r["attachments"]:
                if attachment["name"] == "expected":
                    expected = Path(attachment["path"]).stem
                elif attachment["name"] == "actual":
                    actual = data_dir / Path(attachment["path"]).name
            if expected and attachment and expected in filehashes:
                shutil.copyfile(actual, filehashes[expected])
                print(f"{actual} -> {filehashes[expected]}")
