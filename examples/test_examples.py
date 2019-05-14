
# -*- coding: utf-8 -*-
import glob
import os.path as osp
import subprocess
import sys

here = osp.abspath(osp.dirname(__file__))

paths = [i for i in glob.glob(f'{here}/*') if osp.isdir(i)]

services_dir = osp.abspath(osp.join(here, '../packages/services/examples'))
paths += [i for i in glob.glob(f'{services_dir}/*')]


def header(path):
    test_name = osp.basename(path)
    print('\n')
    print('*' * 40)
    print(f'Starting {test_name} test')
    print('*' * 40)


count = 0
for path in sorted(paths):
    if osp.basename(path) == 'node':
        header(path)
        runner = osp.join(path, 'main.py')
        subprocess.check_call([sys.executable, runner])
        count += 1
        continue

    if osp.basename(path) in ['app']:
        header(path)
        runner = osp.join(path, 'check.py')
        subprocess.check_call([sys.executable, runner])
        count += 1
        continue

    if not osp.exists(osp.join(path, 'main.py')):
        continue

    count += 1
    header(path)
    runner = osp.join(here, 'example_check.py')
    subprocess.check_call([sys.executable, runner, '--example-dir', path])

print(f'\n\n{count} tests complete!')
