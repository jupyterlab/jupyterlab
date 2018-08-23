# coding: utf-8
"""JupyterLab command handler"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import contextlib
from distutils.version import LooseVersion
import errno
import glob
import hashlib
import json
import logging
import os
import os.path as osp
import re
import shutil
import site
import sys
import tarfile
from tempfile import TemporaryDirectory
from threading import Event
from urllib.request import Request, urlopen, urljoin, quote
from urllib.error import URLError

from jupyter_core.paths import jupyter_config_path
from jupyterlab_launcher.process import which, Process, WatchHelper
from notebook.nbextensions import GREEN_ENABLED, GREEN_OK, RED_DISABLED, RED_X

from .semver import Range, gte, lt, lte, gt, make_semver
from .jlpmapp import YARN_PATH, HERE


# The regex for expecting the webpack output.
WEBPACK_EXPECT = re.compile(r'.*/index.out.js')

# The dev mode directory.
DEV_DIR = osp.realpath(os.path.join(HERE, '..', 'dev_mode'))


def pjoin(*args):
    """Join paths to create a real path.
    """
    return osp.realpath(osp.join(*args))


def get_user_settings_dir():
    """Get the configured JupyterLab user settings directory.
    """
    settings_dir = os.environ.get('JUPYTERLAB_SETTINGS_DIR')
    settings_dir = settings_dir or pjoin(
        jupyter_config_path()[0], 'lab', 'user-settings'
    )
    return osp.realpath(settings_dir)


def get_workspaces_dir():
    """Get the configured JupyterLab workspaces directory.
    """
    workspaces_dir = os.environ.get('JUPYTERLAB_WORKSPACES_DIR')
    workspaces_dir = workspaces_dir or pjoin(
        jupyter_config_path()[0], 'lab', 'workspaces'
    )
    return osp.realpath(workspaces_dir)


def get_app_dir():
    """Get the configured JupyterLab app directory.
    """
    # Default to the override environment variable.
    if os.environ.get('JUPYTERLAB_DIR'):
        return osp.realpath(os.environ['JUPYTERLAB_DIR'])

    # Use the default locations for data_files.
    app_dir = pjoin(sys.prefix, 'share', 'jupyter', 'lab')

    # Check for a user level install.
    # Ensure that USER_BASE is defined
    if hasattr(site, 'getuserbase'):
        site.getuserbase()
    userbase = getattr(site, 'USER_BASE', None)
    if HERE.startswith(userbase) and not app_dir.startswith(userbase):
        app_dir = pjoin(userbase, 'share', 'jupyter', 'lab')

    # Check for a system install in '/usr/local/share'.
    elif (sys.prefix.startswith('/usr') and not
          osp.exists(app_dir) and
          osp.exists('/usr/local/share/jupyter/lab')):
        app_dir = '/usr/local/share/jupyter/lab'

    return osp.realpath(app_dir)


def ensure_dev(logger=None):
    """Ensure that the dev assets are available.
    """
    parent = pjoin(HERE, '..')

    if not osp.exists(pjoin(parent, 'node_modules')):
        yarn_proc = Process(['node', YARN_PATH], cwd=parent, logger=logger)
        yarn_proc.wait()

    theme_packages = ['theme-light-extension', 'theme-dark-extension']
    for theme in theme_packages:
        base_path = pjoin(parent, 'packages', theme)
        if not osp.exists(pjoin(base_path, 'static')):
            yarn_proc = Process(['node', YARN_PATH, 'build:webpack'], cwd=base_path,
                                logger=logger)
            yarn_proc.wait()

    if not osp.exists(pjoin(parent, 'dev_mode', 'static')):
        yarn_proc = Process(['node', YARN_PATH, 'build'], cwd=parent,
                            logger=logger)
        yarn_proc.wait()


def ensure_core(logger=None):
    """Ensure that the core assets are available.
    """
    staging = pjoin(HERE, 'staging')

    # Bail if the static directory already exists.
    if osp.exists(pjoin(HERE, 'static')):
        return

    if not osp.exists(pjoin(staging, 'node_modules')):
        yarn_proc = Process(['node', YARN_PATH], cwd=staging, logger=logger)
        yarn_proc.wait()

    if not osp.exists(pjoin(HERE, 'static')):
        yarn_proc = Process(['node', YARN_PATH, 'build'], cwd=staging,
                            logger=logger)
        yarn_proc.wait()


def watch_packages(logger=None):
    """Run watch mode for the source packages.

    Parameters
    ----------
    logger: :class:`~logger.Logger`, optional
        The logger instance.

    Returns
    -------
    A list of `WatchHelper` objects.
    """
    parent = pjoin(HERE, '..')

    if not osp.exists(pjoin(parent, 'node_modules')):
        yarn_proc = Process(['node', YARN_PATH], cwd=parent, logger=logger)
        yarn_proc.wait()

    logger = logger or logging.getLogger('jupyterlab')
    ts_dir = osp.realpath(osp.join(HERE, '..', 'packages', 'metapackage'))

    # Run typescript watch and wait for the string indicating it is done.
    ts_regex = r'.* Found 0 errors\. Watching for file changes\.'
    ts_proc = WatchHelper(['node', YARN_PATH, 'run', 'watch'],
        cwd=ts_dir, logger=logger, startup_regex=ts_regex)

    # Run the metapackage file watcher.
    tsf_regex = 'Watching the metapackage files...'
    tsf_proc = WatchHelper(['node', YARN_PATH, 'run', 'watch:files'],
        cwd=ts_dir, logger=logger, startup_regex=tsf_regex)

    return [ts_proc, tsf_proc]


def watch_dev(logger=None):
    """Run watch mode in a given directory.

    Parameters
    ----------
    logger: :class:`~logger.Logger`, optional
        The logger instance.

    Returns
    -------
    A list of `WatchHelper` objects.
    """
    logger = logger or logging.getLogger('jupyterlab')

    package_procs = watch_packages(logger)

    # Run webpack watch and wait for compilation.
    wp_proc = WatchHelper(['node', YARN_PATH, 'run', 'watch'],
        cwd=DEV_DIR, logger=logger,
        startup_regex=WEBPACK_EXPECT)

    return package_procs + [wp_proc]


def watch(app_dir=None, logger=None):
    """Watch the application.

    Parameters
    ----------
    app_dir: string, optional
        The application directory.
    logger: :class:`~logger.Logger`, optional
        The logger instance.

    Returns
    -------
    A list of processes to run asynchronously.
    """
    _node_check()
    handler = _AppHandler(app_dir, logger)
    return handler.watch()


def install_extension(extension, app_dir=None, logger=None):
    """Install an extension package into JupyterLab.

    The extension is first validated.

    Returns `True` if a rebuild is recommended, `False` otherwise.
    """
    _node_check()
    handler = _AppHandler(app_dir, logger)
    return handler.install_extension(extension)


def uninstall_extension(name, app_dir=None, logger=None):
    """Uninstall an extension by name or path.

    Returns `True` if a rebuild is recommended, `False` otherwise.
    """
    _node_check()
    handler = _AppHandler(app_dir, logger)
    return handler.uninstall_extension(name)


def update_extension(name=None, all_=False, app_dir=None, logger=None):
    """Update an extension by name, or all extensions.

    Either `name` must be given as a string, or `all_` must be `True`.
    If `all_` is `True`, the value of `name` is ignored.

    Returns `True` if a rebuild is recommended, `False` otherwise.
    """
    _node_check()
    handler = _AppHandler(app_dir, logger)
    if all_ is True:
        return handler.update_all_extensions()
    return handler.update_extension(name)


def clean(app_dir=None):
    """Clean the JupyterLab application directory."""
    app_dir = app_dir or get_app_dir()
    if app_dir == pjoin(HERE, 'dev'):
        raise ValueError('Cannot clean the dev app')
    if app_dir == pjoin(HERE, 'core'):
        raise ValueError('Cannot clean the core app')
    for name in ['staging']:
        target = pjoin(app_dir, name)
        if osp.exists(target):
            shutil.rmtree(target)


def build(app_dir=None, name=None, version=None, public_url=None,
        logger=None, command='build:prod', kill_event=None,
        clean_staging=False):
    """Build the JupyterLab application.
    """
    _node_check()
    handler = _AppHandler(app_dir, logger, kill_event=kill_event)
    return handler.build(name=name, version=version, public_url=public_url,
                  command=command, clean_staging=clean_staging)


def get_app_info(app_dir=None, logger=None):
    """Get a dictionary of information about the app.
    """
    handler = _AppHandler(app_dir, logger)
    return handler.info


def enable_extension(extension, app_dir=None, logger=None):
    """Enable a JupyterLab extension.

    Returns `True` if a rebuild is recommended, `False` otherwise.
    """
    handler = _AppHandler(app_dir, logger)
    return handler.toggle_extension(extension, False)


def disable_extension(extension, app_dir=None, logger=None):
    """Disable a JupyterLab package.

    Returns `True` if a rebuild is recommended, `False` otherwise.
    """
    handler = _AppHandler(app_dir, logger)
    return handler.toggle_extension(extension, True)


def check_extension(extension, app_dir=None, installed=False, logger=None):
    """Check if a JupyterLab extension is enabled or disabled.
    """
    handler = _AppHandler(app_dir, logger)
    return handler.check_extension(extension, installed)


def build_check(app_dir=None, logger=None):
    """Determine whether JupyterLab should be built.

    Returns a list of messages.
    """
    _node_check()
    handler = _AppHandler(app_dir, logger)
    return handler.build_check()


def list_extensions(app_dir=None, logger=None):
    """List the extensions.
    """
    handler = _AppHandler(app_dir, logger)
    return handler.list_extensions()


def link_package(path, app_dir=None, logger=None):
    """Link a package against the JupyterLab build.

    Returns `True` if a rebuild is recommended, `False` otherwise.
    """
    handler = _AppHandler(app_dir, logger)
    return handler.link_package(path)


def unlink_package(package, app_dir=None, logger=None):
    """Unlink a package from JupyterLab by path or name.

    Returns `True` if a rebuild is recommended, `False` otherwise.
    """
    handler = _AppHandler(app_dir, logger)
    return handler.unlink_package(package)


def get_app_version(app_dir=None):
    """Get the application version."""
    app_dir = app_dir or get_app_dir()
    handler = _AppHandler(app_dir)
    return handler.info['version']


def get_latest_compatible_package_versions(names, app_dir=None, logger=None):
    """Get the latest compatible version of a list of packages.
    """
    app_dir = app_dir or get_app_dir()
    handler = _AppHandler(app_dir, logger)
    return handler.latest_compatible_package_versions(names)


def read_package(target):
    """Read the package data in a given target tarball.
    """
    tar = tarfile.open(target, "r")
    f = tar.extractfile('package/package.json')
    data = json.loads(f.read().decode('utf8'))
    data['jupyterlab_extracted_files'] = [
        f.path[len('package/'):] for f in tar.getmembers()
    ]
    tar.close()
    return data


# ----------------------------------------------------------------------
# Implementation details
# ----------------------------------------------------------------------


class _AppHandler(object):

    def __init__(self, app_dir, logger=None, kill_event=None):
        """Create a new _AppHandler object
        """
        self.app_dir = app_dir or get_app_dir()
        self.sys_dir = get_app_dir()
        self.logger = logger or logging.getLogger('jupyterlab')
        self.info = self._get_app_info()
        self.kill_event = kill_event or Event()
        # TODO: Make this configurable
        self.registry = 'https://registry.npmjs.org'

    def install_extension(self, extension, existing=None):
        """Install an extension package into JupyterLab.

        The extension is first validated.

        Returns `True` if a rebuild is recommended, `False` otherwise.
        """
        extension = _normalize_path(extension)
        extensions = self.info['extensions']

        # Check for a core extensions.
        if extension in self.info['core_extensions']:
            config = self._read_build_config()
            uninstalled = config.get('uninstalled_core_extensions', [])
            if extension in uninstalled:
                self.logger.info('Installing core extension %s' % extension)
                uninstalled.remove(extension)
                config['uninstalled_core_extensions'] = uninstalled
                self._write_build_config(config)
                return True
            return False

        # Create the app dirs if needed.
        self._ensure_app_dirs()

        # Install the package using a temporary directory.
        with TemporaryDirectory() as tempdir:
            info = self._install_extension(extension, tempdir)

        name = info['name']

        # Local directories get name mangled and stored in metadata.
        if info['is_dir']:
            config = self._read_build_config()
            local = config.setdefault('local_extensions', dict())
            local[name] = info['source']
            self._write_build_config(config)

        # Remove an existing extension with the same name and different path
        if name in extensions:
            other = extensions[name]
            if other['path'] != info['path'] and other['location'] == 'app':
                os.remove(other['path'])

        return True

    def build(self, name=None, version=None, public_url=None,
            command='build:prod', clean_staging=False):
        """Build the application.
        """
        # Set up the build directory.
        app_dir = self.app_dir

        self._populate_staging(
            name=name, version=version, public_url=public_url,
            clean=clean_staging
        )

        staging = pjoin(app_dir, 'staging')

        # Make sure packages are installed.
        self._run(['node', YARN_PATH, 'install'], cwd=staging)

        # Build the app.
        self._run(['node', YARN_PATH, 'run', command], cwd=staging)

    def watch(self):
        """Start the application watcher and then run the watch in
        the background.
        """
        staging = pjoin(self.app_dir, 'staging')

        self._populate_staging()

        # Make sure packages are installed.
        self._run(['node', YARN_PATH, 'install'], cwd=staging)

        proc = WatchHelper(['node', YARN_PATH, 'run', 'watch'],
            cwd=pjoin(self.app_dir, 'staging'),
            startup_regex=WEBPACK_EXPECT,
            logger=self.logger)
        return [proc]

    def list_extensions(self):
        """Print an output of the extensions.
        """
        logger = self.logger
        info = self.info

        logger.info('JupyterLab v%s' % info['version'])

        if info['extensions']:
            info['compat_errors'] = self._get_extension_compat()
            logger.info('Known labextensions:')
            self._list_extensions(info, 'app')
            self._list_extensions(info, 'sys')
        else:
            logger.info('No installed extensions')

        local = info['local_extensions']
        if local:
            logger.info('\n   local extensions:')
            for name in sorted(local):
                logger.info('        %s: %s' % (name, local[name]))

        linked_packages = info['linked_packages']
        if linked_packages:
            logger.info('\n   linked packages:')
            for key in sorted(linked_packages):
                source = linked_packages[key]['source']
                logger.info('        %s: %s' % (key, source))

        uninstalled_core = info['uninstalled_core']
        if uninstalled_core:
            logger.info('\nUninstalled core extensions:')
            [logger.info('    %s' % item) for item in sorted(uninstalled_core)]

        disabled_core = info['disabled_core']
        if disabled_core:
            logger.info('\nDisabled core extensions:')
            [logger.info('    %s' % item) for item in sorted(disabled_core)]

        messages = self.build_check(fast=True)
        if messages:
            logger.info('\nBuild recommended, please run `jupyter lab build`:')
            [logger.info('    %s' % item) for item in messages]

    def build_check(self, fast=False):
        """Determine whether JupyterLab should be built.

        Returns a list of messages.
        """
        app_dir = self.app_dir
        local = self.info['local_extensions']
        linked = self.info['linked_packages']
        messages = []

        # Check for no application.
        pkg_path = pjoin(app_dir, 'static', 'package.json')
        if not osp.exists(pkg_path):
            return ['No built application']

        static_data = self.info['static_data']
        old_jlab = static_data['jupyterlab']
        old_deps = static_data.get('dependencies', dict())

        # Look for mismatched version.
        static_version = old_jlab.get('version', '')
        core_version = old_jlab['version']
        if LooseVersion(static_version) != LooseVersion(core_version):
            msg = 'Version mismatch: %s (built), %s (current)'
            return [msg % (static_version, core_version)]

        # Look for mismatched extensions.
        new_package = self._get_package_template(silent=fast)
        new_jlab = new_package['jupyterlab']
        new_deps = new_package.get('dependencies', dict())

        for ext_type in ['extensions', 'mimeExtensions']:
            # Extensions that were added.
            for ext in new_jlab[ext_type]:
                if ext not in old_jlab[ext_type]:
                    messages.append('%s needs to be included in build' % ext)

            # Extensions that were removed.
            for ext in old_jlab[ext_type]:
                if ext not in new_jlab[ext_type]:
                    messages.append('%s needs to be removed from build' % ext)

        # Look for mismatched dependencies
        for (pkg, dep) in new_deps.items():
            if pkg not in old_deps:
                continue
            # Skip local and linked since we pick them up separately.
            if pkg in local or pkg in linked:
                continue
            if old_deps[pkg] != dep:
                msg = '%s changed from %s to %s'
                messages.append(msg % (pkg, old_deps[pkg], new_deps[pkg]))

        # Look for updated local extensions.
        for (name, source) in local.items():
            if fast:
                continue
            dname = pjoin(app_dir, 'extensions')
            if self._check_local(name, source, dname):
                messages.append('%s content changed' % name)

        # Look for updated linked packages.
        for (name, item) in linked.items():
            if fast:
                continue
            dname = pjoin(app_dir, 'staging', 'linked_packages')
            if self._check_local(name, item['source'], dname):
                messages.append('%s content changed' % name)

        return messages

    def uninstall_extension(self, name):
        """Uninstall an extension by name.

        Returns `True` if a rebuild is recommended, `False` otherwise.
        """
        # Allow for uninstalled core extensions.
        data = self.info['core_data']
        if name in self.info['core_extensions']:
            config = self._read_build_config()
            uninstalled = config.get('uninstalled_core_extensions', [])
            if name not in uninstalled:
                self.logger.info('Uninstalling core extension %s' % name)
                uninstalled.append(name)
                config['uninstalled_core_extensions'] = uninstalled
                self._write_build_config(config)
                return True
            return False

        local = self.info['local_extensions']

        for (extname, data) in self.info['extensions'].items():
            path = data['path']
            if extname == name:
                msg = 'Uninstalling %s from %s' % (name, osp.dirname(path))
                self.logger.info(msg)
                os.remove(path)
                # Handle local extensions.
                if extname in local:
                    config = self._read_build_config()
                    data = config.setdefault('local_extensions', dict())
                    del data[extname]
                    self._write_build_config(config)
                return True

        self.logger.warn('No labextension named "%s" installed' % name)
        return False

    def update_all_extensions(self):
        """Update all non-local extensions.

        Returns `True` if a rebuild is recommended, `False` otherwise.
        """
        should_rebuild = False
        for (extname, _) in self.info['extensions'].items():
            if extname in self.info['local_extensions']:
                continue
            updated = self._update_extension(extname)
            # Rebuild if at least one update happens:
            should_rebuild = should_rebuild or updated
        return should_rebuild

    def update_extension(self, name):
        """Update an extension by name.

        Returns `True` if a rebuild is recommended, `False` otherwise.
        """
        if name not in self.info['extensions']:
            self.logger.warn('No labextension named "%s" installed' % name)
            return False
        return self._update_extension(name)

    def _update_extension(self, name):
        """Update an extension by name.

        Returns `True` if a rebuild is recommended, `False` otherwise.
        """
        try:
            latest = self._latest_compatible_package_version(name)
        except URLError:
            return False
        if latest is None:
            return False
        if latest == self.info['extensions'][name]['version']:
            self.logger.info('Extension %r already up to date' % name)
            return False
        self.logger.info('Updating %s to version %s' % (name, latest))
        return self.install_extension('%s@%s' % (name, latest))


    def link_package(self, path):
        """Link a package at the given path.

        Returns `True` if a rebuild is recommended, `False` otherwise.
        """
        path = _normalize_path(path)
        if not osp.exists(path) or not osp.isdir(path):
            msg = 'Can install "%s" only link local directories'
            raise ValueError(msg % path)

        with TemporaryDirectory() as tempdir:
            info = self._extract_package(path, tempdir)

        messages = _validate_extension(info['data'])
        if not messages:
            return self.install_extension(path)

        # Warn that it is a linked package.
        self.logger.warn('Installing %s as a linked package:', path)
        [self.logger.warn(m) for m in messages]

        # Add to metadata.
        config = self._read_build_config()
        linked = config.setdefault('linked_packages', dict())
        linked[info['name']] = info['source']
        self._write_build_config(config)

        return True

    def unlink_package(self, path):
        """Unlink a package by name or at the given path.

        A ValueError is raised if the path is not an unlinkable package.

        Returns `True` if a rebuild is recommended, `False` otherwise.
        """
        path = _normalize_path(path)
        config = self._read_build_config()
        linked = config.setdefault('linked_packages', dict())

        found = None
        for (name, source) in linked.items():
            if name == path or source == path:
                found = name

        if found:
            del linked[found]
        else:
            local = config.setdefault('local_extensions', dict())
            for (name, source) in local.items():
                if name == path or source == path:
                    found = name
            if found:
                del local[found]
                path = self.info['extensions'][found]['path']
                os.remove(path)

        if not found:
            raise ValueError('No linked package for %s' % path)

        self._write_build_config(config)
        return True

    def toggle_extension(self, extension, value):
        """Enable or disable a lab extension.

        Returns `True` if a rebuild is recommended, `False` otherwise.
        """
        config = self._read_page_config()
        disabled = config.setdefault('disabledExtensions', [])
        did_something = False
        if value and extension not in disabled:
            disabled.append(extension)
            did_something = True
        elif not value and extension in disabled:
            disabled.remove(extension)
            did_something = True
        if did_something:
            self._write_page_config(config)
        return did_something

    def check_extension(self, extension, check_installed_only=False):
        """Check if a lab extension is enabled or disabled
        """
        info = self.info

        if extension in info["core_extensions"]:
            return self._check_core_extension(
                extension, info, check_installed_only)

        if extension in info["linked_packages"]:
            self.logger.info('%s:%s' % (extension, GREEN_ENABLED))
            return True

        return self._check_common_extension(
            extension, info, check_installed_only)

    def _check_core_extension(self, extension, info, check_installed_only):
        """Check if a core extension is enabled or disabled
        """
        if extension in info['uninstalled_core']:
            self.logger.info('%s:%s' % (extension, RED_X))
            return False
        if check_installed_only:
            self.logger.info('%s: %s' % (extension, GREEN_OK))
            return True
        if extension in info['disabled_core']:
            self.logger.info('%s: %s' % (extension, RED_DISABLED))
            return False
        self.logger.info('%s:%s' % (extension, GREEN_ENABLED))
        return True

    def _check_common_extension(self, extension, info, check_installed_only):
        """Check if a common (non-core) extension is enabled or disabled
        """
        if extension not in info['extensions']:
            self.logger.info('%s:%s' % (extension, RED_X))
            return False

        errors = self._get_extension_compat()[extension]
        if errors:
            self.logger.info('%s:%s (compatibility errors)' % (extension, RED_X))
            return False

        if check_installed_only:
            self.logger.info('%s: %s' % (extension, GREEN_OK))
            return True

        if _is_disabled(extension, info['disabled']):
            self.logger.info('%s: %s' % (extension, RED_DISABLED))
            return False

        self.logger.info('%s:%s' % (extension, GREEN_ENABLED))
        return True

    def _get_app_info(self):
        """Get information about the app.
        """

        info = dict()
        info['core_data'] = core_data = _get_core_data()
        info['extensions'] = extensions = self._get_extensions(core_data)
        page_config = self._read_page_config()
        info['disabled'] = page_config.get('disabledExtensions', [])
        info['local_extensions'] = self._get_local_extensions()
        info['linked_packages'] = self._get_linked_packages()
        info['app_extensions'] = app = []
        info['sys_extensions'] = sys = []
        for (name, data) in extensions.items():
            data['is_local'] = name in info['local_extensions']
            if data['location'] == 'app':
                app.append(name)
            else:
                sys.append(name)

        info['uninstalled_core'] = self._get_uninstalled_core_extensions()

        info['static_data'] = _get_static_data(self.app_dir)
        app_data = info['static_data'] or core_data
        info['version'] = app_data['jupyterlab']['version']
        info['publicUrl'] = app_data['jupyterlab'].get('publicUrl', '')

        info['sys_dir'] = self.sys_dir
        info['app_dir'] = self.app_dir

        info['core_extensions'] = core_extensions = _get_core_extensions()

        disabled_core = []
        for key in core_extensions:
            if key in info['disabled']:
                disabled_core.append(key)

        info['disabled_core'] = disabled_core
        return info

    def _populate_staging(self, name=None, version=None, public_url=None,
            clean=False):
        """Set up the assets in the staging directory.
        """
        app_dir = self.app_dir
        staging = pjoin(app_dir, 'staging')
        if clean and osp.exists(staging):
            self.logger.info("Cleaning %s", staging)
            shutil.rmtree(staging)

        self._ensure_app_dirs()
        if not version:
            version = self.info['core_data']['jupyterlab']['version']

        # Look for mismatched version.
        pkg_path = pjoin(staging, 'package.json')

        if osp.exists(pkg_path):
            with open(pkg_path) as fid:
                data = json.load(fid)
            if data['jupyterlab'].get('version', '') != version:
                shutil.rmtree(staging)
                os.makedirs(staging)

        for fname in ['index.js', 'webpack.config.js',
                      'webpack.prod.config.js',
                      '.yarnrc', 'yarn.js']:
            target = pjoin(staging, fname)
            shutil.copy(pjoin(HERE, 'staging', fname), target)

        # Remove an existing yarn.lock file
        # Because otherwise we can end up with unwanted duplicates
        # cf https://github.com/yarnpkg/yarn/issues/3967
        if osp.exists(pjoin(staging, 'yarn.lock')):
            os.remove(pjoin(staging, 'yarn.lock'))

        # Ensure a clean templates directory
        templates = pjoin(staging, 'templates')
        if osp.exists(templates):
            shutil.rmtree(templates)

        try:
            shutil.copytree(pjoin(HERE, 'staging', 'templates'), templates)
        except shutil.Error as error:
            # `copytree` throws an error if copying to + from NFS even though
            # the copy is successful (see https://bugs.python.org/issue24564)

            if '[Errno 22]' not in str(error) or not osp.exists(templates):
                raise

        # Ensure a clean linked packages directory.
        linked_dir = pjoin(staging, 'linked_packages')
        if osp.exists(linked_dir):
            shutil.rmtree(linked_dir)
        os.makedirs(linked_dir)

        # Template the package.json file.
        # Update the local extensions.
        extensions = self.info['extensions']
        removed = False
        for (key, source) in self.info['local_extensions'].items():
            # Handle a local extension that was removed.
            if key not in extensions:
                config = self._read_build_config()
                data = config.setdefault('local_extensions', dict())
                del data[key]
                self._write_build_config(config)
                removed = True
                continue
            dname = pjoin(app_dir, 'extensions')
            self._update_local(key, source, dname, extensions[key],
                'local_extensions')

        # Update the list of local extensions if any were removed.
        if removed:
            self.info['local_extensions'] = self._get_local_extensions()

        # Update the linked packages.
        linked = self.info['linked_packages']
        for (key, item) in linked.items():
            dname = pjoin(staging, 'linked_packages')
            self._update_local(key, item['source'], dname, item,
                'linked_packages')

        # Then get the package template.
        data = self._get_package_template()

        if version:
            data['jupyterlab']['version'] = version

        if name:
            data['jupyterlab']['name'] = name

        if public_url:
            data['jupyterlab']['publicUrl'] = public_url

        pkg_path = pjoin(staging, 'package.json')
        with open(pkg_path, 'w') as fid:
            json.dump(data, fid, indent=4)

    def _get_package_template(self, silent=False):
        """Get the template the for staging package.json file.
        """
        logger = self.logger
        data = self.info['core_data']
        local = self.info['local_extensions']
        linked = self.info['linked_packages']
        extensions = self.info['extensions']
        jlab = data['jupyterlab']

        def format_path(path):
            path = osp.relpath(path, pjoin(self.app_dir, 'staging'))
            path = 'file:' + path.replace(os.sep, '/')
            if os.name == 'nt':
                path = path.lower()
            return path

        jlab['linkedPackages'] = dict()

        # Handle local extensions.
        for (key, source) in local.items():
            jlab['linkedPackages'][key] = source

        # Handle linked packages.
        for (key, item) in linked.items():
            path = pjoin(self.app_dir, 'staging', 'linked_packages')
            path = pjoin(path, item['filename'])
            data['dependencies'][key] = format_path(path)
            jlab['linkedPackages'][key] = item['source']

        # Handle extensions
        compat_errors = self._get_extension_compat()
        for (key, value) in extensions.items():
            # Reject incompatible extensions with a message.
            errors = compat_errors[key]
            if errors:
                if not silent:
                    _log_single_compat_errors(
                        logger, key, value['version'], errors
                    )
                continue

            data['dependencies'][key] = format_path(value['path'])

            jlab_data = value['jupyterlab']
            for item in ['extension', 'mimeExtension']:
                ext = jlab_data.get(item, False)
                if not ext:
                    continue
                if ext is True:
                    ext = ''
                jlab[item + 's'][key] = ext

        # Handle uninstalled core extensions.
        for item in self.info['uninstalled_core']:
            if item in jlab['extensions']:
                data['jupyterlab']['extensions'].pop(item)
            else:
                data['jupyterlab']['mimeExtensions'].pop(item)
            # Remove from dependencies as well.
            data['dependencies'].pop(item)

        return data

    def _check_local(self, name, source, dname):
        """Check if a local package has changed.

        `dname` is the directory name of existing package tar archives.
        """
        # Extract the package in a temporary directory.
        with TemporaryDirectory() as tempdir:
            info = self._extract_package(source, tempdir)
            # Test if the file content has changed.
            # This relies on `_extract_package` adding the hashsum
            # to the filename, allowing a simple exist check to
            # compare the hash to the "cache" in dname.
            target = pjoin(dname, info['filename'])
            return not osp.exists(target)

    def _update_local(self, name, source, dname, data, dtype):
        """Update a local dependency.  Return `True` if changed.
        """
        # Extract the package in a temporary directory.
        existing = data['filename']
        with TemporaryDirectory() as tempdir:
            info = self._extract_package(source, tempdir)

            # Bail if the file content has not changed.
            if info['filename'] == existing:
                return existing

            shutil.move(info['path'], pjoin(dname, info['filename']))

        # Remove the existing tarball and return the new file name.
        if existing:
            os.remove(pjoin(dname, existing))

        data['filename'] = info['filename']
        data['path'] = pjoin(data['tar_dir'], data['filename'])
        return info['filename']

    def _get_extensions(self, core_data):
        """Get the extensions for the application.
        """
        app_dir = self.app_dir
        extensions = dict()

        # Get system level packages.
        sys_path = pjoin(self.sys_dir, 'extensions')
        app_path = pjoin(self.app_dir, 'extensions')

        extensions = self._get_extensions_in_dir(self.sys_dir, core_data)

        # Look in app_dir if different.
        app_path = pjoin(app_dir, 'extensions')
        if app_path == sys_path or not osp.exists(app_path):
            return extensions

        extensions.update(self._get_extensions_in_dir(app_dir, core_data))

        return extensions

    def _get_extensions_in_dir(self, dname, core_data):
        """Get the extensions in a given directory.
        """
        extensions = dict()
        location = 'app' if dname == self.app_dir else 'sys'
        for target in glob.glob(pjoin(dname, 'extensions', '*.tgz')):
            data = read_package(target)
            deps = data.get('dependencies', dict())
            name = data['name']
            jlab = data.get('jupyterlab', dict())
            path = osp.realpath(target)
            # homepage, repository  are optional
            if 'homepage' in data:
                url = data['homepage']
            elif 'repository' in data and isinstance(data['repository'], dict):
                url = data['repository'].get('url', '')
            else:
                url = ''
            extensions[name] = dict(path=path,
                                    filename=osp.basename(path),
                                    url=url,
                                    version=data['version'],
                                    jupyterlab=jlab,
                                    dependencies=deps,
                                    tar_dir=osp.dirname(path),
                                    location=location)
        return extensions

    def _get_extension_compat(self):
        """Get the extension compatibility info.
        """
        compat = dict()
        core_data = self.info['core_data']
        for (name, data) in self.info['extensions'].items():
            deps = data['dependencies']
            compat[name] = _validate_compatibility(name, deps, core_data)
        return compat

    def _get_local_extensions(self):
        """Get the locally installed extensions.
        """
        return self._get_local_data('local_extensions')

    def _get_linked_packages(self):
        """Get the linked packages.
        """
        info = self._get_local_data('linked_packages')
        dname = pjoin(self.app_dir, 'staging', 'linked_packages')
        for (name, source) in info.items():
            info[name] = dict(source=source, filename='', tar_dir=dname)

        if not osp.exists(dname):
            return info

        for path in glob.glob(pjoin(dname, '*.tgz')):
            path = osp.realpath(path)
            data = read_package(path)
            name = data['name']
            if name not in info:
                self.logger.warn('Removing orphaned linked package %s' % name)
                os.remove(path)
                continue
            item = info[name]
            item['filename'] = osp.basename(path)
            item['path'] = path
            item['version'] = data['version']
            item['data'] = data
        return info

    def _get_uninstalled_core_extensions(self):
        """Get the uninstalled core extensions.
        """
        config = self._read_build_config()
        return config.get('uninstalled_core_extensions', [])

    def _ensure_app_dirs(self):
        """Ensure that the application directories exist"""
        dirs = ['extensions', 'settings', 'staging', 'schemas', 'themes']
        for dname in dirs:
            path = pjoin(self.app_dir, dname)
            if not osp.exists(path):
                try:
                    os.makedirs(path)
                except OSError as e:
                    if e.errno != errno.EEXIST:
                        raise

    def _list_extensions(self, info, ext_type):
        """List the extensions of a given type.
        """
        logger = self.logger
        names = info['%s_extensions' % ext_type]
        if not names:
            return

        dname = info['%s_dir' % ext_type]

        error_accumulator = {}

        logger.info('   %s dir: %s' % (ext_type, dname))
        for name in sorted(names):
            data = info['extensions'][name]
            version = data['version']
            errors = info['compat_errors'][name]
            extra = ''
            if _is_disabled(name, info['disabled']):
                extra += ' %s' % RED_DISABLED
            else:
                extra += ' %s' % GREEN_ENABLED
            if errors:
                extra += ' %s' % RED_X
            else:
                extra += ' %s' % GREEN_OK
            if data['is_local']:
                extra += '*'
            logger.info('        %s v%s%s' % (name, version, extra))
            if errors:
                error_accumulator[name] = (version, errors)

        # Write all errors at end:
        _log_multiple_compat_errors(logger, error_accumulator)

    def _read_build_config(self):
        """Get the build config data for the app dir.
        """
        target = pjoin(self.app_dir, 'settings', 'build_config.json')
        if not osp.exists(target):
            return {}
        else:
            with open(target) as fid:
                return json.load(fid)

    def _write_build_config(self, config):
        """Write the build config to the app dir.
        """
        self._ensure_app_dirs()
        target = pjoin(self.app_dir, 'settings', 'build_config.json')
        with open(target, 'w') as fid:
            json.dump(config, fid, indent=4)

    def _read_page_config(self):
        """Get the page config data for the app dir.
        """
        target = pjoin(self.app_dir, 'settings', 'page_config.json')
        if not osp.exists(target):
            return {}
        else:
            with open(target) as fid:
                return json.load(fid)

    def _write_page_config(self, config):
        """Write the build config to the app dir.
        """
        self._ensure_app_dirs()
        target = pjoin(self.app_dir, 'settings', 'page_config.json')
        with open(target, 'w') as fid:
            json.dump(config, fid, indent=4)

    def _get_local_data(self, source):
        """Get the local data for extensions or linked packages.
        """
        config = self._read_build_config()

        data = config.setdefault(source, dict())
        dead = []
        for (name, source) in data.items():
            if not osp.exists(source):
                dead.append(name)

        for name in dead:
            link_type = source.replace('_', ' ')
            msg = '**Note: Removing dead %s "%s"' % (link_type, name)
            self.logger.warn(msg)
            del data[name]

        if dead:
            self._write_build_config(config)

        return data

    def _install_extension(self, extension, tempdir):
        """Install an extension with validation and return the name and path.
        """
        info = self._extract_package(extension, tempdir)
        data = info['data']

        # Verify that the package is an extension.
        messages = _validate_extension(data)
        if messages:
            msg = '"%s" is not a valid extension:\n%s'
            raise ValueError(msg % (extension, '\n'.join(messages)))

        # Verify package compatibility.
        core_data = _get_core_data()
        deps = data.get('dependencies', dict())
        errors = _validate_compatibility(extension, deps, core_data)
        if errors:
            msg = _format_compatibility_errors(
                data['name'], data['version'], errors
            )
            # Check for compatible version unless:
            # - A specific version was requested (@ in name,
            #   but after first char to allow for scope marker).
            # - Package is locally installed.
            if '@' not in extension[1:] and not info['is_dir']:
                name = info['name']
                try:
                    version = self._latest_compatible_package_version(name)
                except URLError:
                    # We cannot add any additional information to error message
                    raise ValueError(msg)

                if version and name:
                    self.logger.warning('Incompatible extension:\n%s', msg)
                    self.logger.warning('Found compatible version: %s', version)
                    with TemporaryDirectory() as tempdir2:
                        return self._install_extension(
                            '%s@%s' % (name, version), tempdir2)

                # Extend message to better guide the user what to do:
                conflicts = '\n'.join(msg.splitlines()[2:])
                msg = ''.join((
                    self._format_no_compatible_package_version(name),
                    "\n\n",
                    conflicts))

            raise ValueError(msg)

        # Move the file to the app directory.
        target = pjoin(self.app_dir, 'extensions', info['filename'])
        if osp.exists(target):
            os.remove(target)

        shutil.move(info['path'], target)

        info['path'] = target
        return info

    def _extract_package(self, source, tempdir, quiet=False):
        """Call `npm pack` for an extension.

        The pack command will download the package tar if `source` is
        a package name, or run `npm pack` locally if `source` is a
        directory.
        """
        is_dir = osp.exists(source) and osp.isdir(source)
        if is_dir and not osp.exists(pjoin(source, 'node_modules')):
            self._run(['node', YARN_PATH, 'install'], cwd=source, quiet=quiet)

        info = dict(source=source, is_dir=is_dir)

        ret = self._run([which('npm'), 'pack', source], cwd=tempdir, quiet=quiet)
        if ret != 0:
            msg = '"%s" is not a valid npm package'
            raise ValueError(msg % source)

        path = glob.glob(pjoin(tempdir, '*.tgz'))[0]
        info['data'] = read_package(path)
        if is_dir:
            info['sha'] = sha = _tarsum(path)
            target = path.replace('.tgz', '-%s.tgz' % sha)
            shutil.move(path, target)
            info['path'] = target
        else:
            info['path'] = path

        info['filename'] = osp.basename(info['path'])
        info['name'] = info['data']['name']
        info['version'] = info['data']['version']

        return info


    def _latest_compatible_package_version(self, name):
        """Get the latest compatible version of a package"""
        core_data = self.info['core_data']
        try:
            metadata = _fetch_package_metadata(self.registry, name, self.logger)
        except URLError:
            return
        versions = metadata.get('versions', [])

        # Sort pre-release first, as we will reverse the sort:
        def sort_key(key_value):
            return _semver_key(key_value[0], prerelease_first=True)

        for version, data in sorted(versions.items(),
                                    key=sort_key,
                                    reverse=True):
            deps = data.get('dependencies', {})
            errors = _validate_compatibility(name, deps, core_data)
            if not errors:
                # Found a compatible version
                # Verify that the version is a valid extension.
                with TemporaryDirectory() as tempdir:
                    info = self._extract_package(
                        '%s@%s' % (name, version), tempdir, quiet=True)
                if _validate_extension(info['data']):
                    # Invalid, do not consider other versions
                    return
                # Valid
                return version

    def latest_compatible_package_versions(self, names):
        """Get the latest compatible versions of several packages

        Like _latest_compatible_package_version, but optimized for
        retrieving the latest version for several packages in one go.
        """
        core_data = self.info['core_data']

        keys = []
        for name in names:
            try:
                metadata = _fetch_package_metadata(self.registry, name, self.logger)
            except URLError:
                continue
            versions = metadata.get('versions', [])

            # Sort pre-release first, as we will reverse the sort:
            def sort_key(key_value):
                return _semver_key(key_value[0], prerelease_first=True)

            for version, data in sorted(versions.items(),
                                        key=sort_key,
                                        reverse=True):
                deps = data.get('dependencies', {})
                errors = _validate_compatibility(name, deps, core_data)
                if not errors:
                    # Found a compatible version
                    keys.append('%s@%s' % (name, version))
                    break  # break inner for


        versions = {}
        if not keys:
            return versions
        with TemporaryDirectory() as tempdir:
            ret = self._run([which('npm'), 'pack'] + keys, cwd=tempdir, quiet=True)
            if ret != 0:
                msg = '"%s" is not a valid npm package'
                raise ValueError(msg % keys)

            for key in keys:
                fname = key[0].replace('@', '') + key[1:].replace('@', '-').replace('/', '-') + '.tgz'
                data = read_package(os.path.join(tempdir, fname))
                # Verify that the version is a valid extension.
                if not _validate_extension(data):
                    # Valid
                    versions[key] = data['version']
        return versions

    def _format_no_compatible_package_version(self, name):
        """Get the latest compatible version of a package"""
        core_data = self.info['core_data']
        # Whether lab version is too new:
        lab_newer_than_latest = False
        # Whether the latest version of the extension depend on a "future" version
        # of a singleton package (from the perspective of current lab version):
        latest_newer_than_lab = False
        try:
            metadata = _fetch_package_metadata(self.registry, name, self.logger)
        except URLError:
            pass
        else:
            versions = metadata.get('versions', [])

            # Sort pre-release first, as we will reverse the sort:
            def sort_key(key_value):
                return _semver_key(key_value[0], prerelease_first=True)

            store = tuple(sorted(versions.items(), key=sort_key, reverse=True))
            latest_deps = store[0][1].get('dependencies', {})
            core_deps = core_data['dependencies']
            singletons = core_data['jupyterlab']['singletonPackages']

            for (key, value) in latest_deps.items():
                if key in singletons:
                    c = _compare_ranges(core_deps[key], value)
                    lab_newer_than_latest = lab_newer_than_latest or c < 0
                    latest_newer_than_lab = latest_newer_than_lab or c > 0

        if lab_newer_than_latest:
            # All singleton deps in current version of lab are newer than those
            # in the latest version of the extension
            return ("This extension does not yet support the current version of "
                    "JupyterLab.\n")


        parts = ["No version of {extension} could be found that is compatible with "
                 "the current version of JupyterLab."]
        if latest_newer_than_lab:
            parts.extend(("However, it seems to support a new version of JupyterLab.",
                          "Consider upgrading JupyterLab."))

        return " ".join(parts).format(extension=name)

    def _run(self, cmd, **kwargs):
        """Run the command using our logger and abort callback.

        Returns the exit code.
        """
        if self.kill_event.is_set():
            raise ValueError('Command was killed')

        kwargs['logger'] = self.logger
        kwargs['kill_event'] = self.kill_event
        proc = Process(cmd, **kwargs)
        return proc.wait()


def _node_check():
    """Check for the existence of nodejs with the correct version.
    """
    try:
        proc = Process(['node', 'node-version-check.js'], cwd=HERE, quiet=True)
        proc.wait()
    except Exception:
        msg = 'Please install nodejs 5+ and npm before continuing. nodejs may be installed using conda or directly from the nodejs website.'
        raise ValueError(msg)


def _normalize_path(extension):
    """Normalize a given extension if it is a path.
    """
    extension = osp.expanduser(extension)
    if osp.exists(extension):
        extension = osp.abspath(extension)
    return extension


def _validate_extension(data):
    """Detect if a package is an extension using its metadata.

    Returns any problems it finds.
    """
    jlab = data.get('jupyterlab', None)
    if jlab is None:
        return ['No `jupyterlab` key']
    if not isinstance(jlab, dict):
        return ['The `jupyterlab` key must be a JSON object']
    extension = jlab.get('extension', False)
    mime_extension = jlab.get('mimeExtension', False)
    themeDir = jlab.get('themeDir', '')
    schemaDir = jlab.get('schemaDir', '')

    messages = []
    if not extension and not mime_extension:
        messages.append('No `extension` or `mimeExtension` key present')

    if extension == mime_extension:
        msg = '`mimeExtension` and `extension` must point to different modules'
        messages.append(msg)

    files = data['jupyterlab_extracted_files']
    main = data.get('main', 'index.js')
    if not main.endswith('.js'):
        main += '.js'

    if extension is True:
        extension = main
    elif extension and not extension.endswith('.js'):
        extension += '.js'

    if mime_extension is True:
        mime_extension = main
    elif mime_extension and not mime_extension.endswith('.js'):
        mime_extension += '.js'

    if extension and extension not in files:
        messages.append('Missing extension module "%s"' % extension)

    if mime_extension and mime_extension not in files:
        messages.append('Missing mimeExtension module "%s"' % mime_extension)

    if themeDir and not any(f.startswith(themeDir) for f in files):
        messages.append('themeDir is empty: "%s"' % themeDir)

    if schemaDir and not any(f.startswith(schemaDir) for f in files):
        messages.append('schemaDir is empty: "%s"' % schemaDir)

    return messages


def _tarsum(input_file):
    """
    Compute the recursive sha sum of a tar file.
    """
    tar = tarfile.open(input_file, "r")
    chunk_size = 100 * 1024
    h = hashlib.new("sha1")

    for member in tar:
        if not member.isfile():
            continue
        f = tar.extractfile(member)
        data = f.read(chunk_size)
        while data:
            h.update(data)
            data = f.read(chunk_size)
    return h.hexdigest()


def _get_core_data():
    """Get the data for the app template.
    """
    with open(pjoin(HERE, 'staging', 'package.json')) as fid:
        return json.load(fid)


def _get_static_data(app_dir):
    """Get the data for the app static dir.
    """
    target = pjoin(app_dir, 'static', 'package.json')
    if os.path.exists(target):
        with open(target) as fid:
            return json.load(fid)
    else:
        return None


def _validate_compatibility(extension, deps, core_data):
    """Validate the compatibility of an extension.
    """
    core_deps = core_data['dependencies']
    singletons = core_data['jupyterlab']['singletonPackages']

    errors = []

    for (key, value) in deps.items():
        if key in singletons:
            overlap = _test_overlap(core_deps[key], value)
            if overlap is False:
                errors.append((key, core_deps[key], value))

    return errors


def _test_overlap(spec1, spec2):
    """Test whether two version specs overlap.

    Returns `None` if we cannot determine compatibility,
    otherwise whether there is an overlap
    """
    cmp = _compare_ranges(spec1, spec2)
    if cmp is None:
        return
    return cmp == 0


def _compare_ranges(spec1, spec2):
    """Test whether two version specs overlap.

    Returns `None` if we cannot determine compatibility,
    otherwise return 0 if there is an overlap, 1 if
    spec1 is lower/older than spec2, and -1 if spec1
    is higher/newer than spec2.
    """
    # Test for overlapping semver ranges.
    r1 = Range(spec1, True)
    r2 = Range(spec2, True)

    # If either range is empty, we cannot verify.
    if not r1.range or not r2.range:
        return

    x1 = r1.set[0][0].semver
    x2 = r1.set[0][-1].semver
    y1 = r2.set[0][0].semver
    y2 = r2.set[0][-1].semver

    o1 = r1.set[0][0].operator
    o2 = r2.set[0][0].operator

    # We do not handle (<) specifiers.
    if (o1.startswith('<') or o2.startswith('<')):
        return

    # Handle single value specifiers.
    lx = lte if x1 == x2 else lt
    ly = lte if y1 == y2 else lt
    gx = gte if x1 == x2 else gt
    gy = gte if x1 == x2 else gt

    # Handle unbounded (>) specifiers.
    def noop(x, y, z):
        return True

    if x1 == x2 and o1.startswith('>'):
        lx = noop
    if y1 == y2 and o2.startswith('>'):
        ly = noop

    # Check for overlap.
    if (gte(x1, y1, True) and ly(x1, y2, True) or
        gy(x2, y1, True) and ly(x2, y2, True) or
        gte(y1, x1, True) and lx(y1, x2, True) or
        gx(y2, x1, True) and lx(y2, x2, True)
       ):
       return 0
    if gte(y1, x2, True):
        return 1
    if gte(x1, y2, True):
        return -1
    raise AssertionError('Unexpected case comparing version ranges')


def _is_disabled(name, disabled=[]):
    """Test whether the package is disabled.
    """
    for pattern in disabled:
        if name == pattern:
            return True
        if re.compile(pattern).match(name) is not None:
            return True
    return False


def _format_compatibility_errors(name, version, errors):
    """Format a message for compatibility errors.
    """
    msgs = []
    l0 = 10
    l1 = 10
    for error in errors:
        pkg, jlab, ext = error
        jlab = str(Range(jlab, True))
        ext = str(Range(ext, True))
        msgs.append((pkg, jlab, ext))
        l0 = max(l0, len(pkg) + 1)
        l1 = max(l1, len(jlab) + 1)

    msg = '\n"%s@%s" is not compatible with the current JupyterLab'
    msg = msg % (name, version)
    msg += '\nConflicting Dependencies:\n'
    msg += 'JupyterLab'.ljust(l0)
    msg += 'Extension'.ljust(l1)
    msg += 'Package\n'

    for (pkg, jlab, ext) in msgs:
        msg += jlab.ljust(l0) + ext.ljust(l1) + pkg + '\n'

    return msg


def _log_multiple_compat_errors(logger, errors_map):
    """Log compatability errors for multiple extensions at once"""

    outdated = []
    others = []

    for name, (version, errors) in errors_map.items():
        age = _compat_error_age(errors)
        if age > 0:
            outdated.append(name)
        else:
            others.append(name)

    if outdated:
        logger.warn('\n        '.join(
            ['\n   The following extension are outdated:'] +
            outdated +
            ['\n   Consider running "jupyter labextension update --all" '
             'to check for updates.\n']
        ))

    for name in others:
        version, errors = errors_map[name]
        msg = _format_compatibility_errors(name, version, errors)
        logger.warn(msg + '\n')


def _log_single_compat_errors(logger, name, version, errors):
    """Log compatability errors for a single extension"""

    age = _compat_error_age(errors)
    if age > 0:
        logger.warn('The extension "%s" is outdated.\n', name)
    else:
        msg = _format_compatibility_errors(name, version, errors)
        logger.warn(msg + '\n')


def _compat_error_age(errors):
    """Compare all incompatabilites for an extension.

    Returns a number > 0 if all extensions are older than that supported by lab.
    Returns a number < 0 if all extensions are newer than that supported by lab.
    Returns 0 otherwise (i.e. a mix).
    """
    # Do any extensions depend on too old lab packages?
    any_older = False
    # Do any extensions depend on too new lab packages?
    any_newer = False

    for _, jlab, ext in errors:
        c = _compare_ranges(ext, jlab)
        any_newer = any_newer or c < 0
        any_older = any_older or c > 0
    if any_older and not any_newer:
        return 1
    elif any_newer and not any_older:
        return -1
    return 0


def _get_core_extensions():
    """Get the core extensions.
    """
    data = _get_core_data()['jupyterlab']
    return list(data['extensions']) + list(data['mimeExtensions'])


def _semver_prerelease_key(prerelease):
    """Sort key for prereleases.

    Precedence for two pre-release versions with the same
    major, minor, and patch version MUST be determined by
    comparing each dot separated identifier from left to
    right until a difference is found as follows:
    identifiers consisting of only digits are compare
    numerically and identifiers with letters or hyphens
    are compared lexically in ASCII sort order. Numeric
    identifiers always have lower precedence than non-
    numeric identifiers. A larger set of pre-release
    fields has a higher precedence than a smaller set,
    if all of the preceding identifiers are equal.
    """
    for entry in prerelease:
        if isinstance(entry, int):
            # Assure numerics always sort before string
            yield ('', entry)
        else:
            # Use ASCII compare:
            yield (entry,)


def _semver_key(version, prerelease_first=False):
    """A sort key-function for sorting semver version string.

    The default sorting order is ascending (0.x -> 1.x -> 2.x).

    If `prerelease_first`, pre-releases will come before
    ALL other semver keys (not just those with same version).
    I.e (1.0-pre, 2.0-pre -> 0.x -> 1.x -> 2.x).

    Otherwise it will sort in the standard way that it simply
    comes before any release with shared version string
    (0.x -> 1.0-pre -> 1.x -> 2.0-pre -> 2.x).
    """
    v = make_semver(version, True)
    if prerelease_first:
        key = (0,) if v.prerelease else (1,)
    else:
        key = ()
    key = key + (v.major, v.minor, v.patch)
    if not prerelease_first:
        #  NOT having a prerelease is > having one
        key = key + (0,) if v.prerelease else (1,)
    if v.prerelease:
        key = key + tuple(_semver_prerelease_key(
            v.prerelease))

    return key


def _fetch_package_metadata(registry, name, logger):
    """Fetch the metadata for a package from the npm registry"""
    req = Request(
        urljoin(registry, quote(name, safe='@')),
        headers={
            'Accept': ('application/vnd.npm.install-v1+json;'
                        ' q=1.0, application/json; q=0.8, */*')
        }
    )
    try:
        logger.debug('Fetching URL: %s' % (req.full_url))
    except AttributeError:
        logger.debug('Fetching URL: %s' % (req.get_full_url()))
    try:
        with contextlib.closing(urlopen(req)) as response:
            return json.loads(response.read().decode('utf-8'))
    except URLError as exc:
        logger.warning(
            'Failed to fetch package metadata for %r: %r',
            name, exc)
        raise


if __name__ == '__main__':
    watch_dev(HERE)
