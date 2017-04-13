# coding: utf-8
"""Jupyter LabExtension Dev Mode."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import argparse
import os
import os.path as osp
from .commands import (
    here, list_extensions, run, _get_root_dir, _ensure_package
)


def lablink(folder):
    """Link against JupyterLab master.
    """
    if folder == _get_root_dir():
        _ensure_package()
    files = os.listdir(osp.join(here, '..', 'packages'))
    extensions = [e.replace('@jupyterlab/', '') for e in list_extensions()]
    files = [f for f in files if f in extensions]

    # Only link the ones in `node_modules`.
    target = osp.join(folder, 'node_modules', '@jupyterlab')
    if not osp.exists(osp.join(target)):
        raise ValueError('Invalid target: no node_modules')
    available = os.listdir(target)
    files = [f for f in files if f in available]

    # Get the real paths of the files.
    files = [osp.join(here, '..', 'packages', f) for f in files]
    files = [osp.realpath(f) for f in files]

    cmd = ['npm', 'link'] + files
    run(cmd, cwd=folder)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    args, opts = parser.parse_known_args()
    if opts:
        folder = osp.expanduser(opts[0])
        folder = osp.abspath(folder)
    else:
        folder = _get_root_dir()
    lablink(folder)
