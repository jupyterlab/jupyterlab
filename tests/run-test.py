# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os

from jupyterlab.tests.test_app import JestApp

HERE = os.path.realpath(os.path.dirname(__file__))


def run(jest_dir):
    jest_app = JestApp.instance()
    jest_app.jest_dir = jest_dir
    jest_app.initialize()
    jest_app.install_kernel(
        kernel_name='xpython',
        kernel_spec={
            'argv': [
                'xpython',
                '-f', '{connection_file}'
            ],
            'display_name': 'xpython',
            'language': 'python'
        }
    )
    jest_app.start()


if __name__ == '__main__':
    run(HERE)
