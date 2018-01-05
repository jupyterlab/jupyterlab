# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
from jupyterlab.tests.test_app import run_karma

HERE = os.path.realpath(os.path.dirname(__file__))

if __name__ == '__main__':
    run_karma(HERE)
