# coding: utf-8
"""JupyterLab entry points"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from jinja2 import Environment, FileSystemLoader
import json
import os
from os import path as osp
from os.path import join as pjoin
from subprocess import check_call, check_output
import shutil
import tarfile

from jupyter_core.paths import ENV_JUPYTER_PATH, ENV_CONFIG_PATH


here = osp.dirname(osp.abspath(__file__))
build_dir = pjoin(ENV_JUPYTER_PATH[0], 'lab')
cache_dir = pjoin(build_dir, 'cache')
pkg_path = pjoin(build_dir, 'package.json')
config_dir = pjoin(ENV_CONFIG_PATH[0], 'labconfig')
TEMPLATE_ENVIRONMENT = Environment(
    autoescape=False,
    loader=FileSystemLoader(pjoin(here, 'src')),
    trim_blocks=False)


def install_extension(extension):
    """Install an extension package into JupyterLab.

    Follows the semantics of https://docs.npmjs.com/cli/install.

    The extension is first validated.
    """
    tar_name = validate_extension(extension)
    path = pjoin(cache_dir, tar_name)
    check_call(['npm', 'install', path], cwd=build_dir)


def uninstall_extension(extension):
    """Uninstall an extension by name.
    """
    pkg = _read_package()
    del pkg['dependencies'][extension]
    with open(pkg_path, 'w') as fid:
        json.dump(pkg, fid)


def list_extensions():
    """List installed extensions.
    """
    pkg = _read_package()
    for ext in sorted(pkg['dependencies']):
        print(ext)


def validate_extension(extension):
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


def link_extension(package):
    """Link a package into JupyterLab

    Follows the semantics of https://docs.npmjs.com/cli/link.
    """
    check_call(['npm', 'link', package], cwd=build_dir)


def build():
    """Build the JupyterLab application."""
    pkg = _read_package()
    # Template and write the index.js
    names = list(pkg['dependencies'].keys())
    context = dict(jupyterlab_extensions=names)
    with open(pjoin(build_dir, 'index.js'), 'w') as fid:
        fid.write(_render_template('index.js', context))
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


def delete_config(name):
    """Deletes the key from the JupyterLab configuration."""
    pass


def _ensure_package():
    """Make sure there is a package.json file."""
    if osp.exists(pkg_path):
        return
    if not osp.exists(build_dir):
        os.makedirs(build_dir)
    shutil.copy2(pjoin(here, 'src', 'package.json'),
                 pjoin(build_dir, 'package.json'))
    shutil.copy2(pjoin(here, 'src', 'webpack.config.js'),
                 pjoin(build_dir, 'webpack.config.js'))
    check_call(['npm', 'install'], cwd=build_dir)


def _read_package():
    """Read the JupyterLab package.json data.
    """
    _ensure_package()
    with open(pkg_path) as fid:
        return json.load(fid)


def _render_template(template_filename, context):
    """Render a jinja template"""
    return TEMPLATE_ENVIRONMENT.get_template(template_filename).render(context)


if __name__ == '__main__':
    build()
