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
import tarfile

from jupyter_core.paths import ENV_JUPYTER_PATH


here = osp.dirname(osp.abspath(__file__))


def install_extension(extension):
    """Install an extension package into JupyterLab.

    Follows the semantics of https://docs.npmjs.com/cli/install.

    The extension is first validated.
    """
    tar_name, pkg_name = validate_extension(extension)
    path = pjoin(_get_cache_dir(), tar_name)
    check_call(['npm', 'install', '--save', path], cwd=_get_build_dir())
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
    for ext in sorted(data['jupyterlab']['extensions']):
        print(ext)


def validate_extension(extension):
    """Verify that a JupyterLab extension is valid.
    """
    extension = osp.expanduser(extension)
    if osp.exists(extension):
        extension = osp.abspath(extension)
    _ensure_package()
    cache_dir = _get_cache_dir()
    # npm pack the extension
    output = check_output(['npm', 'pack', extension], cwd=cache_dir)
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


def link_extension(package):
    """Link a package into JupyterLab

    Follows the semantics of https://docs.npmjs.com/cli/link.
    """
    check_call(['npm', 'link', package], cwd=_get_build_dir())


def build():
    """Build the JupyterLab application."""
    _ensure_package()
    check_call(['npm', 'run', 'build'], cwd=_get_build_dir())


def _ensure_package():
    """Make sure there is a package.json file."""
    run = False
    build_dir = _get_build_dir()
    cache_dir = _get_cache_dir()
    if not osp.exists(build_dir):
        os.makedirs(build_dir)
        run = True
    if not osp.exists(cache_dir):
        os.makedirs(cache_dir)
        run = True
    for name in ['package.json', 'index.template.js', 'webpack.config.js']:
        dest = pjoin(build_dir, name)
        if not osp.exists(dest):
            shutil.copy2(pjoin(here, name), dest)
            run = True
    if run:
        check_call(['npm', 'install'], cwd=build_dir)


def _read_package():
    """Read the JupyterLab package.json data.
    """
    _ensure_package()
    with open(_get_pkg_path()) as fid:
        return json.load(fid)


def _get_build_dir():
    return pjoin(ENV_JUPYTER_PATH[0], 'lab')


def _get_pkg_path():
    return pjoin(_get_build_dir(), 'package.json')


def _get_cache_dir():
    return pjoin(_get_build_dir(), 'cache')
