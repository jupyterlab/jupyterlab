# coding: utf-8
"""Test installation of JupyterLab extensions"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import glob
import json
import os
import shutil
import sys
from os.path import join as pjoin
from unittest import TestCase
import pytest

try:
    from unittest.mock import patch
except ImportError:
    from mock import patch  # py2

from ipython_genutils import py3compat
from ipython_genutils.tempdir import TemporaryDirectory
from notebook.notebookapp import NotebookApp
from jupyter_core import paths

from jupyterlab import commands
from jupyterlab.extension import load_jupyter_server_extension
from jupyterlab.commands import (
    install_extension, uninstall_extension, list_extensions,
    build, link_package, unlink_package, build_check,
    disable_extension, enable_extension, get_app_info,
    _test_overlap
)

here = os.path.dirname(os.path.abspath(__file__))


def touch(file, mtime=None):
    """ensure a file exists, and set its modification time

    returns the modification time of the file
    """
    dirname = os.path.dirname(file)
    if not os.path.exists(dirname):
        os.makedirs(dirname)
    open(file, 'a').close()
    # set explicit mtime
    if mtime:
        atime = os.stat(file).st_atime
        os.utime(file, (atime, mtime))
    return os.stat(file).st_mtime


class TestExtension(TestCase):

    def tempdir(self):
        td = TemporaryDirectory()
        self.tempdirs.append(td)
        return py3compat.cast_unicode(td.name)

    def setUp(self):
        # Any TemporaryDirectory objects appended to this list will be cleaned
        # up at the end of the test run.
        self.tempdirs = []
        self.devnull = open(os.devnull, 'w')

        @self.addCleanup
        def cleanup_tempdirs():
            for d in self.tempdirs:
                d.cleanup()

        self.test_dir = self.tempdir()

        self.data_dir = pjoin(self.test_dir, 'data')
        self.config_dir = pjoin(self.test_dir, 'config')
        self.pkg_names = dict()

        # Copy in the mock packages.
        for name in ['extension', 'incompat', 'package', 'mimeextension']:
            src = pjoin(here, 'mock_packages', name)

            def ignore(dname, files):
                if 'node_modules' in dname:
                    files = []
                if 'node_modules' in files:
                    files.remove('node_modules')
                return dname, files

            dest = pjoin(self.test_dir, name)
            shutil.copytree(src, dest, ignore=ignore)

            # Make a node modules folder so npm install is not called.
            os.makedirs(pjoin(dest, 'node_modules'))

            setattr(self, 'mock_' + name, dest)
            with open(pjoin(dest, 'package.json')) as fid:
                data = json.load(fid)
            self.pkg_names[name] = data['name']

        self.patches = []
        p = patch.dict('os.environ', {
            'JUPYTER_CONFIG_DIR': self.config_dir,
            'JUPYTER_DATA_DIR': self.data_dir,
            'JUPYTERLAB_DIR': pjoin(self.data_dir, 'lab')
        })
        self.patches.append(p)
        for mod in [paths]:
            if hasattr(mod, 'ENV_JUPYTER_PATH'):
                p = patch.object(mod, 'ENV_JUPYTER_PATH', [self.data_dir])
                self.patches.append(p)
            if hasattr(mod, 'ENV_CONFIG_PATH'):
                p = patch.object(mod, 'ENV_CONFIG_PATH', [self.config_dir])
                self.patches.append(p)
            if hasattr(mod, 'CONFIG_PATH'):
                p = patch.object(mod, 'CONFIG_PATH', self.config_dir)
                self.patches.append(p)
            if hasattr(mod, 'BUILD_PATH'):
                p = patch.object(mod, 'BUILD_PATH', self.data_dir)
                self.patches.append(p)
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

        # verify our patches
        self.assertEqual(paths.ENV_CONFIG_PATH, [self.config_dir])
        self.assertEqual(paths.ENV_JUPYTER_PATH, [self.data_dir])
        self.assertEqual(
            commands.get_app_dir(),
            os.path.realpath(pjoin(self.data_dir, 'lab'))
        )

        self.app_dir = commands.get_app_dir()

    def test_install_extension(self):
        install_extension(self.mock_extension)
        path = pjoin(self.app_dir, 'extensions', '*.tgz')
        assert glob.glob(path)
        extensions = get_app_info(self.app_dir)['extensions']
        assert self.pkg_names['extension'] in extensions

    def test_install_twice(self):
        install_extension(self.mock_extension)
        path = pjoin(commands.get_app_dir(), 'extensions', '*.tgz')
        install_extension(self.mock_extension)
        assert glob.glob(path)
        extensions = get_app_info(self.app_dir)['extensions']
        assert self.pkg_names['extension'] in extensions

    def test_install_mime_renderer(self):
        install_extension(self.mock_mimeextension)
        name = self.pkg_names['mimeextension']
        assert name in get_app_info(self.app_dir)['extensions']

        uninstall_extension(name)
        assert name not in get_app_info(self.app_dir)['extensions']

    def test_install_incompatible(self):
        with pytest.raises(ValueError) as excinfo:
            install_extension(self.mock_incompat)
        assert 'Conflicting Dependencies' in str(excinfo.value)

    def test_install_failed(self):
        path = self.mock_package
        with pytest.raises(ValueError):
            install_extension(path)
        with open(pjoin(path, 'package.json')) as fid:
            data = json.load(fid)
        extensions = get_app_info(self.app_dir)['extensions']
        assert not data['name'] in extensions

    def test_validation(self):
        path = self.mock_extension
        os.remove(pjoin(path, 'index.js'))
        with pytest.raises(ValueError):
            install_extension(path)

        path = self.mock_mimeextension
        os.remove(pjoin(path, 'index.js'))
        with pytest.raises(ValueError):
            install_extension(path)

    def test_uninstall_extension(self):
        install_extension(self.mock_extension)
        uninstall_extension(self.pkg_names['extension'])
        path = pjoin(self.app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(self.app_dir)['extensions']
        assert self.pkg_names['extension'] not in extensions

    def test_uninstall_core_extension(self):
        uninstall_extension('@jupyterlab/console-extension')
        app_dir = self.app_dir
        build(app_dir)
        with open(pjoin(app_dir, 'staging', 'package.json')) as fid:
            data = json.load(fid)
        extensions = data['jupyterlab']['extensions']
        assert '@jupyterlab/console-extension' not in extensions

        install_extension('@jupyterlab/console-extension')
        build(app_dir)
        with open(pjoin(app_dir, 'staging', 'package.json')) as fid:
            data = json.load(fid)
        extensions = data['jupyterlab']['extensions']
        assert '@jupyterlab/console-extension' in extensions

    def test_link_extension(self):
        path = self.mock_extension
        name = self.pkg_names['extension']
        link_package(path)
        app_dir = self.app_dir
        linked = get_app_info(app_dir)['linked_packages']
        assert name not in linked
        assert name in get_app_info(app_dir)['extensions']
        unlink_package(path)
        linked = get_app_info(app_dir)['linked_packages']
        assert name not in linked
        assert name not in get_app_info(app_dir)['extensions']

    def test_link_package(self):
        path = self.mock_package
        name = self.pkg_names['package']
        link_package(path)
        app_dir = self.app_dir
        linked = get_app_info(app_dir)['linked_packages']
        assert name in linked
        assert name not in get_app_info(app_dir)['extensions']
        unlink_package(path)
        linked = get_app_info(app_dir)['linked_packages']
        assert name not in linked

    def test_unlink_package(self):
        target = self.mock_package
        link_package(target)
        unlink_package(target)
        linked = get_app_info(self.app_dir)['linked_packages']
        assert self.pkg_names['package'] not in linked

    def test_list_extensions(self):
        install_extension(self.mock_extension)
        list_extensions()

    def test_app_dir(self):
        app_dir = self.tempdir()

        install_extension(self.mock_extension, app_dir)
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert glob.glob(path)
        extensions = get_app_info(app_dir)['extensions']
        assert self.pkg_names['extension'] in extensions

        uninstall_extension(self.pkg_names['extension'], app_dir)
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(app_dir)['extensions']
        assert self.pkg_names['extension'] not in extensions

        link_package(self.mock_package, app_dir)
        linked = get_app_info(app_dir)['linked_packages']
        assert self.pkg_names['package'] in linked

        unlink_package(self.mock_package, app_dir)
        linked = get_app_info(app_dir)['linked_packages']
        assert self.pkg_names['package'] not in linked

    def test_app_dir_use_sys_prefix(self):
        app_dir = self.tempdir()
        if os.path.exists(self.app_dir):
            os.removedirs(self.app_dir)

        install_extension(self.mock_extension)
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(app_dir)['extensions']
        assert self.pkg_names['extension'] in extensions

    def test_app_dir_shadowing(self):
        app_dir = self.tempdir()
        sys_dir = self.app_dir
        if os.path.exists(sys_dir):
            os.removedirs(sys_dir)

        install_extension(self.mock_extension)
        sys_path = pjoin(sys_dir, 'extensions', '*.tgz')
        assert glob.glob(sys_path)
        app_path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(app_path)
        extensions = get_app_info(app_dir)['extensions']
        assert self.pkg_names['extension'] in extensions

        install_extension(self.mock_extension, app_dir)
        assert glob.glob(app_path)
        extensions = get_app_info(app_dir)['extensions']
        assert self.pkg_names['extension'] in extensions

        uninstall_extension(self.pkg_names['extension'], app_dir)
        assert not glob.glob(app_path)
        assert glob.glob(sys_path)
        extensions = get_app_info(app_dir)['extensions']
        assert self.pkg_names['extension'] in extensions

        uninstall_extension(self.pkg_names['extension'], app_dir)
        assert not glob.glob(app_path)
        assert not glob.glob(sys_path)
        extensions = get_app_info(app_dir)['extensions']
        assert self.pkg_names['extension'] not in extensions

    def test_build(self):
        install_extension(self.mock_extension)
        build()
        # check staging directory.
        entry = pjoin(self.app_dir, 'staging', 'build', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert self.pkg_names['extension'] in data

        # check static directory.
        entry = pjoin(self.app_dir, 'static', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert self.pkg_names['extension'] in data

    def test_build_custom(self):
        install_extension(self.mock_extension)
        build(name='foo', version='1.0')

        # check static directory.
        entry = pjoin(self.app_dir, 'static', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert self.pkg_names['extension'] in data

        pkg = pjoin(self.app_dir, 'static', 'package.json')
        with open(pkg) as fid:
            data = json.load(fid)
        assert data['jupyterlab']['name'] == 'foo'
        assert data['jupyterlab']['version'] == '1.0'

    def test_load_extension(self):
        app = NotebookApp()
        stderr = sys.stderr
        sys.stderr = self.devnull
        app.initialize(argv=[])
        sys.stderr = stderr
        load_jupyter_server_extension(app)

    def test_disable_extension(self):
        app_dir = self.tempdir()
        install_extension(self.mock_extension, app_dir)
        disable_extension(self.pkg_names['extension'], app_dir)
        info = get_app_info(app_dir)
        assert self.pkg_names['extension'] in info['disabled']
        disable_extension('@jupyterlab/notebook-extension', app_dir)
        info = get_app_info(app_dir)
        assert '@jupyterlab/notebook-extension' in info['disabled']
        assert self.pkg_names['extension'] in info['disabled']

    def test_enable_extension(self):
        app_dir = self.tempdir()
        install_extension(self.mock_extension, app_dir)
        disable_extension(self.pkg_names['extension'], app_dir)
        enable_extension(self.pkg_names['extension'], app_dir)
        info = get_app_info(app_dir)
        assert self.pkg_names['extension'] not in info['disabled']
        disable_extension('@jupyterlab/notebook-extension', app_dir)
        assert self.pkg_names['extension'] not in info['disabled']
        assert '@jupyterlab/notebook-extension' not in info['disabled']

    def test_build_check(self):
        # Do the initial build.
        assert build_check()
        install_extension(self.mock_extension)
        link_package(self.mock_package)
        build()
        assert not build_check()

        # Check installed extensions.
        install_extension(self.mock_mimeextension)
        assert build_check()
        uninstall_extension(self.pkg_names['mimeextension'])
        assert not build_check()

        # Check local extensions.
        pkg_path = pjoin(self.mock_extension, 'package.json')
        with open(pkg_path) as fid:
            data = json.load(fid)
        with open(pkg_path, 'rb') as fid:
            orig = fid.read()
        data['foo'] = 'bar'
        with open(pkg_path, 'w') as fid:
            json.dump(data, fid)
        assert build_check()
        assert build_check()

        with open(pkg_path, 'wb') as fid:
            fid.write(orig)

        assert not build_check()

        # Check linked packages.
        pkg_path = pjoin(self.mock_package, 'index.js')
        with open(pkg_path, 'rb') as fid:
            orig = fid.read()
        with open(pkg_path, 'wb') as fid:
            fid.write(orig + b'\nconsole.log("hello");')
        assert build_check()
        assert build_check()

        with open(pkg_path, 'wb') as fid:
            fid.write(orig)
        assert not build_check()

    def test_compatibility(self):
        assert _test_overlap('^0.6.0', '^0.6.1')
        assert _test_overlap('>0.1', '0.6')
        assert _test_overlap('~0.5.0', '~0.5.2')
        assert _test_overlap('0.5.2', '^0.5.0')

        assert not _test_overlap('^0.5.0', '^0.6.0')
        assert not _test_overlap('~1.5.0', '^1.6.0')

        assert _test_overlap('*', '0.6') is None
        assert _test_overlap('<0.6', '0.1') is None
