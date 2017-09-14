# coding: utf-8
"""Test installation of JupyterLab extensions"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import glob
import json
import os
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
from jupyterlab.extension import (
    load_jupyter_server_extension
)
from jupyterlab.commands import (
    install_extension, uninstall_extension, list_extensions,
    build, link_package, unlink_package, should_build,
    disable_extension, enable_extension, _get_extensions,
    _get_linked_packages, _ensure_package, _get_disabled,
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
        self._mock_extensions = []
        self.devnull = open(os.devnull, 'w')

        @self.addCleanup
        def cleanup_tempdirs():
            for d in self.tempdirs:
                d.cleanup()

        self.test_dir = self.tempdir()
        self.data_dir = pjoin(self.test_dir, 'data')
        self.config_dir = pjoin(self.test_dir, 'config')
        self.source_dir = pjoin(here, 'mockextension')
        self.incompat_dir = pjoin(here, 'mockextension-incompat')
        self.mock_package = pjoin(here, 'mockpackage')
        self.mime_renderer_dir = pjoin(here, 'mock-mimeextension')

        self.patches = []
        p = patch.dict('os.environ', {
            'JUPYTER_CONFIG_DIR': self.config_dir,
            'JUPYTER_DATA_DIR': self.data_dir,
        })
        self.patches.append(p)
        for mod in (paths, commands):
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
        self.assertEqual(commands.ENV_JUPYTER_PATH, [self.data_dir])
        self.assertEqual(commands.get_app_dir(), os.path.realpath(pjoin(self.data_dir, 'lab')))

        self.app_dir = commands.get_app_dir()

    def tearDown(self):
        for modulename in self._mock_extensions:
            sys.modules.pop(modulename)

    def test_install_extension(self):
        install_extension(self.source_dir)
        path = pjoin(self.app_dir, 'extensions', '*python-tests*.tgz')
        assert glob.glob(path)
        assert '@jupyterlab/python-tests' in _get_extensions(self.app_dir)

    def test_install_twice(self):
        install_extension(self.source_dir)
        path = pjoin(commands.get_app_dir(), 'extensions', '*python-tests*.tgz')
        install_extension(self.source_dir)
        assert glob.glob(path)
        assert '@jupyterlab/python-tests' in _get_extensions(self.app_dir)

    def test_install_mime_renderer(self):
        install_extension(self.mime_renderer_dir)
        assert '@jupyterlab/mime-extension-test' in _get_extensions(self.app_dir)

        uninstall_extension('@jupyterlab/mime-extension-test')
        assert '@jupyterlab/mime-extension-test' not in _get_extensions(self.app_dir)

    def test_install_incompatible(self):
        with pytest.raises(ValueError) as excinfo:
            install_extension(self.incompat_dir)
        assert 'Conflicting Dependencies' in str(excinfo.value)

    def test_install_failed(self):
        path = self.mock_package
        with pytest.raises(ValueError):
            install_extension(path)
        with open(pjoin(path, 'package.json')) as fid:
            data = json.load(fid)
        assert not data['name'] in _get_extensions(self.app_dir)

    def test_uninstall_extension(self):
        install_extension(self.source_dir)
        uninstall_extension('@jupyterlab/python-tests')
        path = pjoin(self.app_dir, 'extensions', '*python_tests*.tgz')
        assert not glob.glob(path)
        assert '@jupyterlab/python-tests' not in _get_extensions(self.app_dir)

    def test_uninstall_core_extension(self):
        uninstall_extension('@jupyterlab/console-extension')
        app_dir = self.app_dir
        _ensure_package(app_dir)
        with open(pjoin(app_dir, 'staging', 'package.json')) as fid:
            data = json.load(fid)
        extensions = data['jupyterlab']['extensions']
        assert '@jupyterlab/console-extension' not in extensions

        install_extension('@jupyterlab/console-extension')
        _ensure_package(app_dir)
        with open(pjoin(app_dir, 'staging', 'package.json')) as fid:
            data = json.load(fid)
        extensions = data['jupyterlab']['extensions']
        assert '@jupyterlab/console-extension' in extensions

    def test_link_extension(self):
        link_package(self.source_dir)
        linked = _get_linked_packages().keys()
        assert '@jupyterlab/python-tests' in linked
        assert '@jupyterlab/python-tests' in _get_extensions(self.app_dir)

    def test_link_mime_renderer(self):
        link_package(self.mime_renderer_dir)
        linked = _get_linked_packages().keys()
        assert '@jupyterlab/mime-extension-test' in linked
        assert '@jupyterlab/mime-extension-test' in _get_extensions(self.app_dir)

        unlink_package('@jupyterlab/mime-extension-test')
        linked = _get_linked_packages().keys()
        assert '@jupyterlab/mime-extension-test' not in linked
        assert '@jupyterlab/mime-extension-test' not in _get_extensions(self.app_dir)

    def test_link_package(self):
        path = self.mock_package
        link_package(path)
        linked = _get_linked_packages().keys()
        with open(pjoin(path, 'package.json')) as fid:
            data = json.load(fid)
        assert data['name'] in linked
        assert not data['name'] in _get_extensions(self.app_dir)
        unlink_package(path)
        linked = _get_linked_packages().keys()
        assert not data['name'] in linked

    def test_link_incompatible(self):
        with pytest.raises(ValueError) as excinfo:
            install_extension(self.incompat_dir)
        assert 'Conflicting Dependencies' in str(excinfo.value)

    def test_unlink_package(self):
        target = self.source_dir
        link_package(target)
        unlink_package(target)
        linked = _get_linked_packages().keys()
        assert '@jupyterlab/python-tests' not in linked
        assert '@jupyterlab/python-tests' not in _get_extensions(self.app_dir)

    def test_list_extensions(self):
        install_extension(self.source_dir)
        list_extensions()

    def test_app_dir(self):
        app_dir = self.tempdir()

        install_extension(self.source_dir, app_dir)
        path = pjoin(app_dir, 'extensions', '*python-tests*.tgz')
        assert glob.glob(path)
        assert '@jupyterlab/python-tests' in _get_extensions(app_dir)

        uninstall_extension('@jupyterlab/python-tests', app_dir)
        path = pjoin(app_dir, 'extensions', '*python-tests*.tgz')
        assert not glob.glob(path)
        assert '@jupyterlab/python-tests' not in _get_extensions(app_dir)

        link_package(self.source_dir, app_dir)
        linked = _get_linked_packages(app_dir).keys()
        assert '@jupyterlab/python-tests' in linked

        unlink_package(self.source_dir, app_dir)
        linked = _get_linked_packages(app_dir).keys()
        assert '@jupyterlab/python-tests' not in linked

    def test_app_dir_use_sys_prefix(self):
        app_dir = self.tempdir()
        if os.path.exists(self.app_dir):
            os.removedirs(self.app_dir)

        install_extension(self.source_dir)
        path = pjoin(app_dir, 'extensions', '*python-tests*.tgz')
        assert not glob.glob(path)
        assert '@jupyterlab/python-tests' in _get_extensions(app_dir)

    def test_app_dir_shadowing(self):
        app_dir = self.tempdir()
        sys_dir = self.app_dir
        if os.path.exists(sys_dir):
            os.removedirs(sys_dir)

        install_extension(self.source_dir)
        sys_path = pjoin(sys_dir, 'extensions', '*python-tests*.tgz')
        assert glob.glob(sys_path)
        app_path = pjoin(app_dir, 'extensions', '*python-tests*.tgz')
        assert not glob.glob(app_path)
        assert '@jupyterlab/python-tests' in _get_extensions(app_dir)

        install_extension(self.source_dir, app_dir)
        assert glob.glob(app_path)
        assert '@jupyterlab/python-tests' in _get_extensions(app_dir)

        uninstall_extension('@jupyterlab/python-tests', app_dir)
        assert not glob.glob(app_path)
        assert glob.glob(sys_path)
        assert '@jupyterlab/python-tests' in _get_extensions(app_dir)

        uninstall_extension('@jupyterlab/python-tests', app_dir)
        assert not glob.glob(app_path)
        assert not glob.glob(sys_path)
        assert '@jupyterlab/python-tests' not in _get_extensions(app_dir)

    def test_build(self):
        install_extension(self.source_dir)
        build()
        # check staging directory.
        entry = pjoin(self.app_dir, 'staging', 'build', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert '@jupyterlab/python-tests' in data

        # check static directory.
        entry = pjoin(self.app_dir, 'static', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert '@jupyterlab/python-tests' in data

    def test_build_custom(self):
        install_extension(self.source_dir)
        build(name='foo', version='1.0')

        # check static directory.
        entry = pjoin(self.app_dir, 'static', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert '@jupyterlab/python-tests' in data

        pkg = pjoin(self.app_dir, 'static', 'package.json')
        with open(pkg) as fid:
            data = json.load(fid)
        assert data['jupyterlab']['name'] == 'foo'
        assert data['jupyterlab']['version'] == '1.0'

    def test_load_extension(self):
        app = NotebookApp()
        stderr = sys.stderr
        sys.stderr = self.devnull
        app.initialize()
        sys.stderr = stderr
        load_jupyter_server_extension(app)

    def test_disable_extension(self):
        app_dir = self.tempdir()
        install_extension(self.source_dir, app_dir)
        disable_extension('@jupyterlab/python-tests', app_dir)
        disabled = _get_disabled(app_dir)
        assert '@jupyterlab/python-tests' in disabled
        disable_extension('@jupyterlab/notebook-extension', app_dir)
        disabled = _get_disabled(app_dir)
        assert '@jupyterlab/notebook-extension' in disabled

    def test_enable_extension(self):
        app_dir = self.tempdir()
        install_extension(self.source_dir, app_dir)
        disable_extension('@jupyterlab/python-tests', app_dir)
        enable_extension('@jupyterlab/python-tests', app_dir)
        disabled = _get_disabled(app_dir)
        assert '@jupyterlab/python-tests' not in disabled

    def test_should_build(self):
        assert not should_build()[0]
        install_extension(self.source_dir)
        assert should_build()[0]
        build()
        assert not should_build()[0]
        uninstall_extension('@jupyterlab/python-tests')
        assert should_build()[0]

    def test_compatibility(self):
        assert _test_overlap('^0.6.0', '^0.6.1')
        assert _test_overlap('>0.1', '0.6')
        assert _test_overlap('~0.5.0', '~0.5.2')
        assert _test_overlap('0.5.2', '^0.5.0')

        assert not _test_overlap('^0.5.0', '^0.6.0')
        assert not _test_overlap('~1.5.0', '^1.6.0')

        assert _test_overlap('*', '0.6') is None
        assert _test_overlap('<0.6', '0.1') is None
