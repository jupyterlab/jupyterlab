
# -*- coding: utf-8 -*-
import glob
import os.path as osp
import subprocess
import sys

here = osp.abspath(osp.dirname(__file__))

paths = [i for i in glob.glob(f'{here}/*') if osp.isdir(i)]

services_dir = osp.abspath(osp.join(here, '../packages/services/examples'))
paths += [i for i in glob.glob(f'{services_dir}/*')]


for path in sorted(paths):
    if osp.basename(path) == 'node':
        runner = osp.join(path, 'main.py')
        subprocess.check_call([sys.executable, runner])
        continue

    if osp.basename(path) in ['app']:
        continue

    if not osp.exists(osp.join(path, 'main.py')):
        continue

    runner = osp.join(here, 'example_check.py')
    subprocess.check_call([sys.executable, runner, '--example-dir', path])
