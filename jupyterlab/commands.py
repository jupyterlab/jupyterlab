# coding: utf-8
"""JupyterLab entry points"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
import os
from os import path as osp
from os.path import join as pjoin
from subprocess import check_output
import shutil
import sys
import tarfile

from jupyter_core.paths import ENV_JUPYTER_PATH


here = osp.dirname(osp.abspath(__file__))


def run(cmd, **kwargs):
    """Run a command in the given working directory.
    """
    kwargs.setdefault('shell', sys.platform == 'win32')
    kwargs.setdefault('env', os.environ)
    return check_output(cmd, **kwargs)


def install_extension(extension):
    """Install an extension package into JupyterLab.

    Follows the semantics of https://docs.npmjs.com/cli/install.

    The extension is first validated.

    If link is true, the source directory is linked using `npm link`.
    """
    tar_name, pkg_name = validate_extension(extension)
    path = pjoin(_get_cache_dir(), tar_name)
    cwd = _get_root_dir()
    run(['npm', 'install', '--save', path], cwd=cwd)
    build()


def link_extension(extension):
    """Link against JupyterLab master.
    """
    # Make sure we have the ability to create a symlink.
    if not hasattr(os, 'symlink'):
        raise TypeError('Symlink is not supported')

    # Normalize the path.
    extension = _normalize_path(extension)

    # Verify a package.json
    pkg_path = pjoin(extension, 'package.json')
    if not osp.exists(pkg_path):
        raise TypeError('Cannot install an extension without a package.json')

    # Get the package data.
    with open(pkg_path) as fid:
        pkg_data = json.load(fid)

    # Make sure it is an extension.
    _validate_package(pkg_data)

    # Fill in the symlinks
    target = osp.join(extension, 'node_modules', '@jupyterlab')
    if not osp.exists(target):
        os.makedirs(target)
    for f in os.listdir(osp.join(here, '..', 'packages')):
        # Get the real path of the source.
        src = osp.join(here, '..', 'packages', f)
        src = osp.realpath(src)
        dest = osp.join(target, f)
        if osp.exists(dest):
            os.remove(dest)
        os.symlink(src, dest)

    data = _read_package()
    name = pkg_data['name']
    data['dependencies'][name] = 'file:' + extension
    data['jupyterlab']['symlinks'][name] = extension
    _write_package(data)

    build()


def unlink_extension(extension):
    """Unlink an extension from JupyterLab.
    """
    data = _read_package()

    # Check if given the name of an extension.
    if extension not in data['dependencies']:

        extension = _normalize_path(extension)

        # Verify a package.json
        pkg_path = pjoin(extension, 'package.json')
        if not osp.exists(pkg_path):
            msg = 'Cannot uninstall an extension without a package.json'
            raise TypeError(msg)

        extension = pkg_path['name']

        if extension not in data['dependencies']:
            # Nothing to do
            return

    del data['dependencies'][extension]
    if extension in data['jupyterlab']['symlinks']:
        del data['jupyterlab']['symlinks'][extension]
    _write_package(data)
    build()


def uninstall_extension(extension):
    """Uninstall an extension by name.
    """
    data = _read_package()
    if extension in data['jupyterlab']['symlinks']:
        return unlink_extension(extension)

    del data['dependencies'][extension]
    _write_package(data)
    build()


def list_extensions():
    """List installed extensions.
    """
    data = _read_package()
    extensions = sorted(data['dependencies'].keys())
    ignore = data['jupyterlab']['notExtensions']
    extensions = [e for e in extensions if e not in ignore]
    return extensions


def validate_extension(extension):
    """Verify that a JupyterLab extension is valid.
    """
    extension = _normalize_path(extension)
    _ensure_package()
    cache_dir = _get_cache_dir()
    # npm pack the extension
    output = run(['npm', 'pack', extension], cwd=cache_dir)
    name = output.decode('utf8').splitlines()[-1]
    # read the package.json data from the file
    tar = tarfile.open(pjoin(cache_dir, name), "r:gz")
    f = tar.extractfile('package/package.json')
    data = json.loads(f.read().decode('utf8'))
    _validate_package(data)
    return name, data['name']


def clean():
    """Clean the JupyterLab application directory."""
    target = pjoin(_get_root_dir(), 'node_modules')
    if osp.exists(target):
        os.remove(target)


def build():
    """Build the JupyterLab application."""
    data = _read_package()
    root_dir = _get_root_dir()
    # Make sure we have all of the symlinks.
    for (name, src) in data['jupyterlab']['symlinks'].values():
        parts = [root_dir, 'node_modules'] + name.split('/')
        dest = pjoin(*parts)
        if osp.exists(dest):
            osp.remove(dest)
        os.symlink(src, dest)
    run(['npm', 'run', 'build'], cwd=_get_root_dir())


def describe():
    """Get the git description of the JupyterLab application.
    """
    description = 'unknown'
    try:
        cwd = os.path.dirname(os.path.dirname(__file__))
        description = run(['git', 'describe'], cwd=cwd)
        description = description.decode('utf8').strip()
    except Exception:
        pass
    return description


def _ensure_package():
    """Make sure there is a package.json file."""
    # Make sure we have the ability to create a symlink.
    if not hasattr(os, 'symlink'):
        raise TypeError('Symlink is not supported')
    cache_dir = _get_cache_dir()
    root_dir = _get_root_dir()
    if not osp.exists(cache_dir):
        os.makedirs(cache_dir)
    for name in ['package.json', 'index.template.js', 'webpack.config.js']:
        dest = pjoin(root_dir, name)
        if not osp.exists(dest) or name != 'package.json':
            shutil.copy2(pjoin(here, name), dest)
    if not osp.exists(pjoin(root_dir, 'node_modules')):
        run(['npm', 'install'], cwd=root_dir)


def _validate_package(data, extension):
    """Validate package.json data.
    """
    msg = '%s is not a valid JupyterLab extension' % extension
    if 'jupyterlab' not in data:
        raise ValueError(msg)
    if not isinstance(data['jupyterlab'], dict):
        raise ValueError(msg)
    if not data['jupyterlab'].get('extension', False):
        raise ValueError(msg)


def _read_package():
    """Read the JupyterLab package.json data.
    """
    _ensure_package()
    with open(_get_pkg_path()) as fid:
        return json.load(fid)


def _write_package(data):
    """Write the JupyterLab package.json data.
    """
    with open(_get_pkg_path(), 'w') as fid:
        json.dump(data, fid)


def _normalize_path(extension):
    extension = osp.expanduser(extension)
    if osp.exists(extension):
        extension = osp.abspath(extension)
    return extension


def _get_root_dir():
    return pjoin(ENV_JUPYTER_PATH[0], 'lab')


def _get_build_dir():
    return pjoin(_get_root_dir(), 'build')


def _get_pkg_path():
    return pjoin(_get_root_dir(), 'package.json')


def _get_cache_dir():
    return pjoin(_get_root_dir(), 'cache')
