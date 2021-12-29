#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from os.path import join as pjoin
import json
import os
import os.path as osp
import sys

from setuptools import setup

NAME = "jupyterlab"
HERE = osp.dirname(osp.abspath(__file__))

ensured_targets = [
    'static/package.json',
    'schemas/@jupyterlab/shortcuts-extension/shortcuts.json',
    'themes/@jupyterlab/theme-light-extension/index.css'
]
ensured_targets = [osp.join(HERE, NAME, t) for t in ensured_targets]

data_files_spec = [
    ('share/jupyter/lab/static', f'{NAME}/static', '**'),
    ('share/jupyter/lab/schemas', f'{NAME}/schemas', '**'),
    ('share/jupyter/lab/themes', f'{NAME}/themes', '**'),
    ('etc/jupyter/jupyter_server_config.d',
     'jupyter-config/jupyter_server_config.d', f'{NAME}.json'),
    ('etc/jupyter/jupyter_notebook_config.d',
     'jupyter-config/jupyter_notebook_config.d', f'{NAME}.json'),
]

def post_dist():
    from packaging.version import Version
    from jupyter_packaging import get_version

    target = pjoin(HERE, NAME, 'static', 'package.json')
    with open(target) as fid:
        version = json.load(fid)['jupyterlab']['version']

    if Version(version) != Version(get_version(f'{NAME}/_version.py')):
        raise ValueError('Version mismatch, please run `npm run prepare:python-release`')


try:
    from jupyter_packaging import wrap_installers, npm_builder, get_data_files

    npm = ['node', pjoin(HERE, NAME, 'staging', 'yarn.js')]
    # In develop mode, just run yarn
    builder = npm_builder(build_cmd=None, npm=npm, force=True)
    cmdclass = wrap_installers(post_develop=builder, post_dist=post_dist, ensured_targets=ensured_targets)


    setup_args = dict(
        cmdclass=cmdclass,
        data_files=get_data_files(data_files_spec)
    )
except ImportError:
    setup_args = dict()


if __name__ == '__main__':
    setup(**setup_args)
