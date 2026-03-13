# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""
This file is meant to be used to test all of the example here and and
in ../packages/services/examples.  We import each of the applications
and add instrument them with a Playwright test that makes sure
there are no console errors or uncaught errors prior to a sentinel
string being printed (see test/example.spec.ts for the sentinel strings
checked before the browser.close() call).
"""

import argparse
import glob
import os.path as osp
import subprocess
import sys
import tempfile

here = osp.abspath(osp.dirname(__file__))


def header(path):
    test_name = osp.basename(path)
    print(
        "\n".join(("\n", "*" * 40, f"Starting {test_name} test in {path}", "*" * 40)),
        flush=True,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--testPath", help="paths containing this string are tested")
    args = parser.parse_args()

    paths = [i for i in glob.glob(f"{here}/*") if osp.isdir(i)]

    services_dir = osp.abspath(osp.join(here, "../packages/services/examples"))
    paths += list(glob.glob(f"{services_dir}/*"))
    if args.testPath:
        paths = [p for p in paths if args.testPath in p]

    print(f"Testing {paths}")
    count = 0
    failed = []
    for path in sorted(paths):
        try:
            if osp.basename(path) == "node":
                with tempfile.TemporaryDirectory() as cwd:
                    header(path)
                    runner = osp.join(path, "main.py")
                    subprocess.check_call([sys.executable, runner], cwd=cwd)  # noqa S603
                    count += 1
            elif osp.exists(osp.join(path, "main.py")):
                with tempfile.TemporaryDirectory() as cwd:
                    header(path)
                    runner = osp.join(here, "example_check.py")
                    subprocess.check_call([sys.executable, runner, path], cwd=cwd)  # noqa S603
                    count += 1
        except subprocess.CalledProcessError:
            failed.append(path)

    if failed:
        msg = "The following examples failed:\n-{}".format("\n-".join(failed))
        raise AssertionError(msg)

    print(f"\n\n{count} tests complete!")


if __name__ == "__main__":
    main()
