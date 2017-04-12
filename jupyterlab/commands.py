# coding: utf-8
"""JupyterLab entry points"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
import os
from os import path as osp
from os.path import join as pjoin
from subprocess import check_call, check_output
import shutil
import sys
import tarfile

from jupyter_core.paths import ENV_JUPYTER_PATH


here = osp.dirname(osp.abspath(__file__))
_shell = sys.platform == 'win32'
_env = dict(PATH=os.environ['PATH'])


def install_extension(extension):
    """Install an extension package into JupyterLab.

    Follows the semantics of https://docs.npmjs.com/cli/install.

    The extension is first validated.
    """
    tar_name, pkg_name = validate_extension(extension)
    path = pjoin(_get_cache_dir(), tar_name)
    check_call(['npm', 'install', '--save', path],
               cwd=_get_root_dir(), shell=_shell, env=_env)
    data = _read_package()
    data['jupyterlab']['extensions'].append(pkg_name)
    data['jupyterlab']['extensions'].sort()
    with open(_get_pkg_path(), 'w') as fid:
        json.dump(data, fid)


def uninstall_extension(extension):
    """Uninstall an extension by name.
    """
    data = _read_package()
    data['jupyterlab']['extensions'].remove(extension)
    del data['dependencies'][extension]
    with open(_get_pkg_path(), 'w') as fid:
        json.dump(data, fid)


def list_extensions():
    """List installed extensions.
    """
    data = _read_package()
    return sorted(data['jupyterlab']['extensions'])


def validate_extension(extension):
    """Verify that a JupyterLab extension is valid.
    """
    extension = osp.expanduser(extension)
    if osp.exists(extension):
        extension = osp.abspath(extension)
    _ensure_package()
    cache_dir = _get_cache_dir()
    # npm pack the extension
    output = check_output(['npm', 'pack', extension],
                          cwd=cache_dir, shell=_shell, env=_env)
    name = output.decode('utf8').splitlines()[-1]
    # read the package.json data from the file
    tar = tarfile.open(pjoin(cache_dir, name), "r:gz")
    f = tar.extractfile('package/package.json')
    data = json.loads(f.read().decode('utf8'))
    msg = '%s is not a valid JupyterLab extension' % extension
    if 'jupyterlab' not in data:
        raise ValueError(msg)
    if not isinstance(data['jupyterlab'], dict):
        raise ValueError(msg)
    if not data['jupyterlab'].get('extension', False):
        raise ValueError(msg)
    return name, data['name']


def build():
    """Build the JupyterLab application."""
    _ensure_package()
    check_call(['npm', 'run', 'build'],
               cwd=_get_root_dir(), shell=_shell, env=_env)


def _ensure_package():
    """Make sure there is a package.json file."""
    cache_dir = _get_cache_dir()
    root_dir = _get_root_dir()
    if not osp.exists(cache_dir):
        os.makedirs(cache_dir)
    for name in ['package.json', 'index.template.js', 'webpack.config.js']:
        dest = pjoin(root_dir, name)
        if not osp.exists(dest):
            shutil.copy2(pjoin(here, name), dest)
    if not osp.exists(pjoin(root_dir, 'node_modules')):
        check_call(['npm', 'install'],
                   cwd=root_dir, shell=_shell, env=_env)


def _read_package():
    """Read the JupyterLab package.json data.
    """
    _ensure_package()
    with open(_get_pkg_path()) as fid:
        return json.load(fid)


def _get_root_dir():
    return pjoin(ENV_JUPYTER_PATH[0], 'lab')


def _get_build_dir():
    return pjoin(_get_root_dir(), 'build')


def _get_pkg_path():
    return pjoin(_get_root_dir(), 'package.json')


def _get_cache_dir():
    return pjoin(_get_root_dir(), 'cache')
