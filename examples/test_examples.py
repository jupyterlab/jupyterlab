
# -*- coding: utf-8 -*-
"""
This file is meant to be used to test all of the example here and and
in ../packages/services/examples.  We import each of the applications
and add instrument them with a puppeteer test that makes sure
there are no console errors or uncaught errors prior to a sentinel
string being printed (see chrome-example-test.js for the sentinel strings
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
    print('\n'.join((
        '\n',
        '*' * 40,
        'Starting %s test in %s' % (test_name, path),
        '*' * 40
    )), flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--testPath", help="paths containing this string are tested")
    args = parser.parse_args()

    paths = [i for i in glob.glob('%s/*' % here) if osp.isdir(i)]

    services_dir = osp.abspath(osp.join(here, '../packages/services/examples'))
    paths += [i for i in glob.glob('%s/*' % services_dir)]
    if args.testPath:
        paths = [p for p in paths if args.testPath in p]

    print('Testing %s'%paths)

    count = 0
    for path in sorted(paths):
        if osp.basename(path) == 'node':
            with tempfile.TemporaryDirectory() as cwd:
                header(path)
                runner = osp.join(path, 'main.py')
                subprocess.check_call([sys.executable, runner], cwd=cwd)
                count += 1
        elif osp.exists(osp.join(path, 'main.py')):
            with tempfile.TemporaryDirectory() as cwd:
                header(path)
                runner = osp.join(here, 'example_check.py')
                subprocess.check_call([sys.executable, runner, path], cwd=cwd)
                count += 1

    print('\n\n%s tests complete!' % count)


if __name__ == "__main__":
    main()

