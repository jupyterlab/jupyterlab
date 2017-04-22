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
from subprocess import check_output
import shutil
import sys
import tarfile
from jupyter_core.paths import ENV_JUPYTER_PATH, ENV_CONFIG_PATH


if sys.platform == 'win32':
    from subprocess import list2cmdline
else:
    def list2cmdline(cmd_list):
        return ' '.join(map(pipes.quote, cmd_list))


here = osp.dirname(osp.abspath(__file__))
CONFIG_PATH = os.environ.get('JUPYTERLAB_CONFIG_DIR', ENV_CONFIG_PATH[0])
BUILD_PATH = ENV_JUPYTER_PATH[0]


def run(cmd, **kwargs):
    """Run a command in the given working directory.
    """
    print('> ' + list2cmdline(cmd))
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
    if pkg_name in config['linked_extensions']:
        del config['linked_extensions'][pkg_name]
    _write_config(config)


def link_extension(extension):
    """Link an extension against the JupyterLab build.
    """
    path = _normalize_path(extension)

    # Verify the package.json data.
    pkg_path = osp.join(path, 'package.json')
    if not osp.exists(pkg_path):
        msg = 'Linked package must point to a directory with package.json'
        raise ValueError(msg)

    with open(pkg_path) as fid:
        data = json.load(fid)

    _validate_package(data, path)

    # Update JupyterLab metadata.
    config = _get_config()
    name = data['name']
    config['linked_extensions'][name] = path
    if name in config['installed_extensions']:
        del config['installed_extensions'][name]
    _write_config(config)


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
        return True

    print('No labextension matching "%s" is linked' % extension)
    return False


def uninstall_extension(name):
    """Uninstall an extension by name.
    """
    config = _get_config()

    if name in config['installed_extensions']:
        del config['installed_extensions'][name]
        _write_config(config)
        return True

    print('No labextension named "%s" installed' % name)
    return False


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
    _validate_package(data, extension)
    return name, data['name']


def clean():
    """Clean the JupyterLab application directory."""
    config = _get_config()
    for name in ['node_modules', 'build']:
        target = pjoin(_get_root_dir(config), name)
        if osp.exists(target):
            shutil.rmtree(target)


def build():
    """Build the JupyterLab application."""
    # Set up the build directory.
    config = _get_config()
    _ensure_package(config)
    root = _get_root_dir(config)

    # Make sure packages are installed.
    run(['npm', 'install'], cwd=root)

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
    pkg_path = pjoin(root_dir, 'package.json')
    with open(pkg_path) as fid:
        data = json.load(fid)
    for (key, value) in config['installed_extensions'].items():
        data['dependencies'][key] = value
        data['jupyterlab']['extensions'].append(key)
    for key in config['linked_extensions']:
        data['jupyterlab']['extensions'].append(key)
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
    data.setdefault('installed_extensions', dict())
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


def _get_cache_dir(config=None):
    config = config or _get_config()
    return pjoin(_get_root_dir(config), 'cache')
