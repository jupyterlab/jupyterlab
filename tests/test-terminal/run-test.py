# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os.path as osp
from jupyterlab.tests.test_app import run_karma

if __name__ == '__main__':
    run_karma(osp.dirname(osp.realpath(__file__)))
