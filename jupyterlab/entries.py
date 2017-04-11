# coding: utf-8
"""JupyterLab entry points"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
from os import path as osp
import tarfile
from subprocess import check_call, check_output

from jupyter_core.paths import ENV_JUPYTER_PATH, ENV_CONFIG_PATH


here = osp.dirname(osp.abspath(__file__))
build_dir = osp.join(ENV_JUPYTER_PATH, 'lab')
cache_dir = osp.join(build_dir, 'cache')
pkg_path = osp.join(build_dir, 'package.json')
config_dir = osp.join(ENV_CONFIG_PATH, 'labconfig')


def install(extension):
    """Install an extension package into JupyterLab.

    Follows the semantics of https://docs.npmjs.com/cli/install.

    The extension is first validated.
    """
    tar_name = validate(extension)
    path = osp.join(cache_dir, tar_name)
    check_call(['npm', 'install', path], cwd=build_dir)


def uninstall(extension):
    """Uninstall an extension by name.
    """
    pkg = _read_package()
    del pkg['dependencies'][extension]
    with open(pkg_path, 'w') as fid:
        json.dump(pkg, fid)


def list(extension):
    """List installed extensions.
    """
    pkg = _read_package()
    print(list(pkg['dependencies'].keys()))


def validate(extension):
    """Verify that a JupyterLab extension is valid.
    """
    if osp.exists(extension):
        extension = osp.abspath(extension)
    _ensure_package()
    # npm pack the extension
    name = check_output(['npm', 'pack', extension], cwd=cache_dir)
    # read the package.json data from the file
    tar = tarfile.open(name.decode('utf8').strip(), "r:gz")
    f = tar.extractfile('package/package.json')
    data = json.loads(f.read().decode('utf8'))
    msg = '%s is not a valid JupyterLab extension' % extension
    if 'jupyterlab' not in data:
        raise ValueError(msg)
    if not isinstance(data['jupyterlab'], dict):
        raise ValueError(msg)
    if not isinstance(data['jupyterlab'].get('extension', False)):
        raise ValueError(msg)
    return name


def link(package):
    """Link a package into JupyterLab

    Follows the semantics of https://docs.npmjs.com/cli/link.
    """
    check_call(['npm', 'link', package], cwd=build_dir)


def build():
    """Build the JupyterLab application."""
    _ensure_package()
    # Template and copy the index.js
    # TODO
    check_call(['npm', 'run', 'build'], cwd=build_dir)


def set_config(name, value):
    """Set a configuration value in the JupyterLab application."""
    pass


def get_config(name):
    """Get a configuration value in the JupyterLab application."""
    pass


def list_config():
    """Show all config settings."""
    pass


def delete_config():
    """Deletes the key from the JupyterLab configuration."""
    pass


def _ensure_package():
    """Make sure there is a package.json file."""
    # TODO copy src/package.json
    # TODO copy src/webpack.config.js
    pkg_data = dict(name='jupyterlab_app', private=True, dependencies=dict())
    if not osp.exists(pkg_path):
        with open(pkg_path, 'w') as fid:
            json.dump(pkg_data, fid)


def _read_package():
    """Read the JupyterLab package.json data.
    """
    _ensure_package()
    with open(pkg_path) as fid:
        return json.load(fid)
