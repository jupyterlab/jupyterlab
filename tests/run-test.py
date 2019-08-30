# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os
from os.path import join as pjoin

from jupyter_core import paths
from jupyterlab.tests.test_app import run_jest, JestApp

HERE = os.path.realpath(os.path.dirname(__file__))


def _install_xpython_kernel():
    # Mimics: https://github.com/jupyterlab/jupyterlab/blob/cd2fb6ac3ecfae2bb4bcab84797932e625e9bb2f/jupyterlab/tests/test_app.py#L80-L95
    kernel_json = {
        'argv': [
            'xpython',
            '-f', '{connection_file}'
        ],
        'display_name': "xpython",
        'language': 'python'
    }
    kernel_dir = pjoin(paths.jupyter_data_dir(), 'kernels', 'xpython')
    os.makedirs(kernel_dir)
    with open(pjoin(kernel_dir, 'kernel.json'), 'w') as f:
        f.write(json.dumps(kernel_json))


if __name__ == '__main__':
    jest_app = JestApp.instance()

    # install the kernel spec for xeus-python
    _install_xpython_kernel()

    run_jest(HERE)
