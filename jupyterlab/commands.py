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

from jupyter_core.paths import ENV_JUPYTER_PATH, ENV_CONFIG_PATH


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
    config = _get_config()
    path = pjoin(_get_cache_dir(config), tar_name)
    run(['npm', 'install', '--save', path], cwd=_get_root_dir(config))
    config['extensions'].append(pkg_name)
    _write_config(config)
    build()


def link_extension(extension):
    """Link against JupyterLab master.
    """
    extension = _normalize_path(extension)

    # Verify the package.json data.
    pkg_path = osp.join(extension, 'package.json')
    if not os.path.exists(pkg_path):
        msg = 'Linked package must point to a directory with package.json'
        raise ValueError(msg)

    with open(extension) as fid:
        data = json.load(fid)

    _validate_package(data, extension)

    # Update JupyterLab metadata.
    config = _get_config()
    config['extensions'].append(data['name'])
    config['links'][data['name']] = extension
    _write_config(config)

    build()


def unlink_extension(extension):
    """Unlink an extension from JupyterLab.
    """
    config = _get_config()
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
    """Make sure the build dir is set up.
    """
    cache_dir = _get_cache_dir()
    root_dir = _get_root_dir()
    if not osp.exists(cache_dir):
        os.makedirs(cache_dir)
    for name in ['index.template.js', 'webpack.config.js']:
        dest = pjoin(root_dir, name)
        shutil.copy2(pjoin(here, name), dest)
    # Template the package.json file
    # TODO
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


def _get_config():
    """Get the JupyterLab config data.
    """
    file = _get_config_path()
    if not osp.exists(file):
        if not osp.exists(osp.basename(file)):
            os.makedirs(osp.basename(file))
        with open(file, 'w') as fid:
            json.dump(dict(), fid)
    with open(file) as fid:
        data = json.load(fid)
    data.setdefault('location', pjoin(ENV_JUPYTER_PATH[0], 'lab'))
    data.setdefault('extensions', [])
    data.setdefault('links', dict())
    return data


def _write_config(data):
    """Write the JupyterLab config data.
    """
    with open(_get_config_path(), 'w') as fid:
        json.dump(data, fid)


def _normalize_path(extension):
    extension = osp.expanduser(extension)
    if osp.exists(extension):
        extension = osp.abspath(extension)
    return extension


def _get_config_path():
    return pjoin(ENV_CONFIG_PATH[0], 'labconfig', 'build_config.json')


def _get_root_dir(config):
    return config['location']


def _get_build_dir(config):
    return pjoin(_get_root_dir(config), 'build')


def _get_pkg_path(config):
    return pjoin(_get_root_dir(config), 'package.json')


def _get_cache_dir(config):
    return pjoin(_get_root_dir(config), 'cache')
