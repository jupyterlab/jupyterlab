# coding: utf-8
"""JupyterLab entry points"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import errno
import json
import pipes
import os
from os import path as osp
from os.path import join as pjoin
from subprocess import check_output, CalledProcessError
import shutil
import sys
import tarfile
from pathlib import Path
import hashlib

from jupyter_core.paths import ENV_JUPYTER_PATH, ENV_CONFIG_PATH
from .builder import get_build_tool


if sys.platform == 'win32':
    from subprocess import list2cmdline
else:
    def list2cmdline(cmd_list):
        return ' '.join(map(pipes.quote, cmd_list))


here = osp.dirname(osp.abspath(__file__))
CONFIG_PATH = os.environ.get('JUPYTERLAB_CONFIG_DIR', ENV_CONFIG_PATH[0])
BUILD_PATH = ENV_JUPYTER_PATH[0]
BUILD_TOOL = os.environ.get('JUPYTERLAB_BUILD_TOOL')


builder = get_build_tool(BUILD_TOOL)


def run(cmd, **kwargs):
    """Run a command in the given working directory.
    """
    print('> ' + list2cmdline(cmd))
    kwargs.setdefault('shell', sys.platform == 'win32')
    kwargs.setdefault('env', os.environ)
    try:
        return check_output(cmd, **kwargs)
    except CalledProcessError as error:
        raise error


def install_extension(extension):
    """Install an extension package into JupyterLab.

    Follows the semantics of https://docs.npmjs.com/cli/install.

    The extension is first validated.
    """
    tar_name, pkg_name = validate_extension(extension)
    config = _get_config()
    path = pjoin(_get_extension_dir(config), tar_name)
    path = "./{}".format(Path(path).relative_to(_get_root_dir(config)))

    # this is apparently the most bulletproof way to reference a local tarball
    builder.install(['{}@file:{}'.format(pkg_name, path)],
                    cwd=_get_root_dir(config))

    # config['installed_extensions'][pkg_name] = path

    if pkg_name in config['linked_extensions']:
        del config['linked_extensions'][pkg_name]

    _write_config(config)
    _ensure_package(config)


def installed_extensions():
    config = _get_config()
    root = _get_root_dir(config)
    extensions_dir = Path(root) / 'extensions'

    installed = {}

    for extension in extensions_dir.glob('*.tgz'):
        try:
            tar = tarfile.open(str(extension), "r:gz")
            f = tar.extractfile('package/package.json')
            data = json.loads(f.read().decode('utf8'))
            installed[data['name']] = {
                "tarfile": str(extension.relative_to(extensions_dir)),
                "data": data
            }
        except err:
            print("Some error with", extension_tarball, err)

    return installed


def link_extension(extension):
    """Link an extension against the JupyterLab build.
    """
    config = _get_config()
    root = _get_root_dir(config)

    path = _normalize_path(extension)

    # Verify the package.json data.
    pkg_path = osp.join(path, 'package.json')
    if not osp.exists(pkg_path):
        msg = 'Linked package must point to a directory with package.json'
        raise ValueError(msg)

    with open(pkg_path) as fid:
        data = json.load(fid)

    _validate_package(data, extension)

    # Use normal yarn link semantics
    builder.link(cwd=path)
    builder.link([data['name']], cwd=root)

    # Update JupyterLab metadata.
    name = data['name']
    config['linked_extensions'][name] = path
    _write_config(config)


def unlink_extension(extension):
    """Unlink an extension from JupyterLab by path or name.
    """
    extension = _normalize_path(extension)
    config = _get_config()
    root = _get_root_dir(config)
    name = None
    path = None
    for (key, value) in config['linked_extensions'].items():
        if value == extension or key == extension:
            name = key
            path = value
            break

    if name:
        builder.unlink([name], cwd=root)
        builder.unlink(cwd=path)
        del config['linked_extensions'][name]
        _write_config(config)
        return True

    print('No labextension matching "%s" is linked' % extension)
    return False


def uninstall_extension(name):
    """Uninstall an extension by name.

       This will be the full npm name, perhaps including a scope: @jupyterlab/some-extension
    """
    config = _get_config()
    root = _get_root_dir(config)

    for extension_name, extension in installed_extensions().items():
        if extension['data']['name'] == name:
            builder.remove([name], cwd=root)

    print('No labextension named "%s" installed' % name)
    return False


def list_extensions():
    """List installed extensions.
    """
    config = _get_config()
    installed = list(installed_extensions().keys())
    linked = list(config['linked_extensions'])
    return sorted(installed + linked)


def validate_extension(extension):
    """Verify that a JupyterLab extension is valid.
    """
    config = _get_config()
    extension = _normalize_path(extension)
    _ensure_package(config)
    extensions_dir = _get_extension_dir(config)
    # npm pack the extension
    output = builder.pack(extension, cwd=extensions_dir)
    name = output.decode('utf8').splitlines()[-1]
    # read the package.json data from the file
    tar = tarfile.open(pjoin(extensions_dir, name), "r:gz")
    f = tar.extractfile('package/package.json')
    data = json.loads(f.read().decode('utf8'))
    _validate_package(data, extension)
    return name, data['name']


def clean():
    """Clean the JupyterLab application directory."""
    config = _get_config()
    for name in ['node_modules', 'build']:
        target = pjoin(_get_root_dir(config), name)
        if osp.exists(target):
            shutil.rmtree(target)


def build(watch=False):
    """Build the JupyterLab application."""
    # Set up the build directory.
    config = _get_config()
    _ensure_package(config)
    root = _get_root_dir(config)

    # Make sure packages are installed.
    builder.install(cwd=root)

    args = ('build',)

    if watch:
        args = args + ('--', '--watch')

    # Build the app.
    builder.run(args, no_capture=watch, cwd=root)


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


def template():
    config = _get_config()
    _ensure_package(config)
    root = _get_root_dir(config)
    builder.run(('template',), cwd=root)


def _ensure_package(config):
    """Make sure the build dir is set up.
    """
    extensions_dir = _get_extension_dir(config)
    root_dir = _get_root_dir(config)
    if not osp.exists(extensions_dir):
        os.makedirs(extensions_dir)
    for name in ['package.json', 'index.template.js', 'webpack.config.js', '.yarnrc', 'make_template.js', 'yarn.lock']:
        dest = pjoin(root_dir, name)
        shutil.copy2(pjoin(here, name), dest)

    # Template the package.json file.
    pkg_path = pjoin(root_dir, 'package.json')
    with open(pkg_path) as fid:
        data = json.load(fid)

    for (extension_name, extension) in installed_extensions().items():
        data['dependencies'][extension_name] = 'file:./extensions/{}'.format(extension['tarfile'])
        data['jupyterlab']['extensions'].append(extension_name)

    for extension_name in config['linked_extensions']:
        data['jupyterlab']['extensions'].append(extension_name)

    with open(pkg_path, 'w') as fid:
        json.dump(data, fid, indent=4)


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


def _get_config(config_dir=None):
    """Get the JupyterLab config data.
    """
    config_dir = config_dir or _get_config_dir()
    file = pjoin(config_dir, 'build_config.json')
    if not osp.exists(file):
        data = {}
    else:
        with open(file) as fid:
            data = json.load(fid)
    data.setdefault('location', pjoin(BUILD_PATH, 'lab'))
    data.setdefault('linked_extensions', dict())
    return data


def _write_config(data, config_dir=None):
    """Write the JupyterLab config data.
    """
    config_dir = config_dir or _get_config_dir()
    if not osp.exists(config_dir):
        try:
            os.makedirs(config_dir)
        except OSError as e:
            if e.errno != errno.EEXIST:
                raise
    with open(pjoin(config_dir, 'build_config.json'), 'w') as fid:
        json.dump(data, fid, indent=4)
    template()


def _normalize_path(extension):
    extension = osp.expanduser(extension)
    if osp.exists(extension):
        extension = osp.abspath(extension)
    return extension


def _get_config_dir():
    return pjoin(CONFIG_PATH, 'labconfig')


def _get_root_dir(config=None):
    config = config or _get_config()
    return config['location']


def _get_build_dir(config=None):
    config = config or _get_config()
    return pjoin(_get_root_dir(config), 'build')


def _get_pkg_path(config=None):
    config = config or _get_config()
    return pjoin(_get_root_dir(config), 'package.json')


def _get_extension_dir(config=None):
    config = config or _get_config()
    return pjoin(_get_root_dir(config), 'extensions')
