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
    config['installed_extensions'][pkg_name] = path
    _write_config(config)
    build()


def link_extension(extension):
    """Link an extension against the JupyterLab build.
    """
    path = _normalize_path(extension)

    # Verify the package.json data.
    pkg_path = osp.join(path, 'package.json')
    if not os.path.exists(pkg_path):
        msg = 'Linked package must point to a directory with package.json'
        raise ValueError(msg)

    with open(extension) as fid:
        data = json.load(fid)

    _validate_package(data, path)

    # Update JupyterLab metadata.
    config = _get_config()
    config['linked_extensions'][data['name']] = path
    _write_config(config)

    build()


def unlink_extension(extension):
    """Unlink an extension from JupyterLab by path or name.
    """
    extension = _normalize_path(extension)
    config = _get_config()

    name = None
    for (key, value) in config['linked_extensions'].items():
        if value == extension or key == extension:
            name = key
            break

    if name:
        del config['linked_extensions'][name]
        _write_config(config)
        build()


def uninstall_extension(name):
    """Uninstall an extension by name.
    """
    config = _get_config()

    if name in config['installed_extensions']:
        del config['installed_extensions'][name]
        _write_config(config)
        build()


def list_extensions():
    """List installed extensions.
    """
    config = _get_config()
    installed = list(config['installed_extensions'])
    linked = list(config['linked_extensions'])
    return sorted(installed + linked)


def validate_extension(extension):
    """Verify that a JupyterLab extension is valid.
    """
    config = _get_config()
    extension = _normalize_path(extension)
    _ensure_package(config)
    cache_dir = _get_cache_dir(config)
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
    config = _get_config()
    target = pjoin(_get_root_dir(config), 'node_modules')
    if osp.exists(target):
        os.remove(target)


def build():
    """Build the JupyterLab application."""
    # Set up the build directory.
    config = _get_config()
    _ensure_package(config)
    root = _get_root_dir(config)

    # Install the linked extensions.
    for value in config['linked_extensions'].values():
        run(['npm', 'install', value], cwd=root)

    # Build the app.
    run(['npm', 'run', 'build'], cwd=root)


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


def _ensure_package(config):
    """Make sure the build dir is set up.
    """
    cache_dir = _get_cache_dir(config)
    root_dir = _get_root_dir(config)
    if not osp.exists(cache_dir):
        os.makedirs(cache_dir)
    for name in ['package.json', 'index.template.js', 'webpack.config.js']:
        dest = pjoin(root_dir, name)
        shutil.copy2(pjoin(here, name), dest)

    # Template the package.json file.
    pkg_path = pjoin(root_dir, name)
    with open(pkg_path) as fid:
        data = json.load(fid)
    for (key, value) in config['installed_extensions'].items():
        data['dependences'][key] = value
        data['extensions'].append(key)
    for key in config['linked_extensions']:
        data['extensions'].append(key)
    with open(pkg_path, 'w') as fid:
        json.dump(data, fid)

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
    data.setdefault('installed_extensions', dict())
    data.setdefault('linked_extensions', dict())
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
