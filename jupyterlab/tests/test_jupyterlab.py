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
    build, link_package, unlink_package, get_app_dir,
    _get_linked_packages, _ensure_package
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
        self.assertEqual(commands.get_app_dir(), pjoin(self.data_dir, 'lab'))

    def tearDown(self):
        for modulename in self._mock_extensions:
            sys.modules.pop(modulename)

    def test_install_extension(self):
        install_extension(self.source_dir)
        path = pjoin(get_app_dir(), 'extensions', '*python-tests*.tgz')
        assert glob.glob(path)
        assert '@jupyterlab/python-tests' in list_extensions()

    def test_uninstall_extension(self):
        install_extension(self.source_dir)
        uninstall_extension('@jupyterlab/python-tests')
        path = pjoin(get_app_dir(), 'extensions', '*python_tests*.tgz')
        assert not glob.glob(path)
        assert '@jupyterlab/python-tests' not in list_extensions()

    def test_uninstall_core_extension(self):
        uninstall_extension('@jupyterlab/console-extension')
        app_dir = get_app_dir()
        _ensure_package(app_dir)
        with open(pjoin(app_dir, 'staging', 'package.json')) as fid:
            data = json.load(fid)
        extensions = data['jupyterlab']['extensions']
        assert '@jupyterlab/console-extension' not in extensions

    def test_link_package(self):
        link_package(self.source_dir)
        linked = _get_linked_packages().keys()
        assert '@jupyterlab/python-tests' in linked
        assert '@jupyterlab/python-tests' in list_extensions()

    def test_unlink_package(self):
        target = self.source_dir
        link_package(target)
        unlink_package(target)
        linked = _get_linked_packages().keys()
        assert '@jupyterlab/python-tests' not in linked
        assert '@jupyterlab/python-tests' not in list_extensions()

    def test_list_extensions(self):
        install_extension(self.source_dir)
        extensions = list_extensions()
        assert '@jupyterlab/python-tests' in extensions

    def test_app_dir(self):
        app_dir = self.tempdir()

        install_extension(self.source_dir, app_dir)
        path = pjoin(app_dir, 'extensions', '*python-tests*.tgz')
        assert glob.glob(path)
        assert '@jupyterlab/python-tests' in list_extensions(app_dir)

        uninstall_extension('@jupyterlab/python-tests', app_dir)
        path = pjoin(app_dir, 'extensions', '*python-tests*.tgz')
        assert not glob.glob(path)
        assert '@jupyterlab/python-tests' not in list_extensions(app_dir)

        link_package(self.source_dir, app_dir)
        linked = _get_linked_packages(app_dir).keys()
        assert '@jupyterlab/python-tests' in linked

        unlink_package(self.source_dir, app_dir)
        linked = _get_linked_packages(app_dir).keys()
        assert '@jupyterlab/python-tests' not in linked

    def test_app_dir_use_sys_prefix(self):
        app_dir = self.tempdir()
        if os.path.exists(get_app_dir()):
            os.removedirs(get_app_dir())

        install_extension(self.source_dir)
        path = pjoin(app_dir, 'extensions', '*python-tests*.tgz')
        assert not glob.glob(path)
        assert '@jupyterlab/python-tests' in list_extensions(app_dir)

    def test_app_dir_shadowing(self):
        app_dir = self.tempdir()
        sys_dir = get_app_dir()
        if os.path.exists(sys_dir):
            os.removedirs(sys_dir)

        install_extension(self.source_dir)
        sys_path = pjoin(sys_dir, 'extensions', '*python-tests*.tgz')
        assert glob.glob(sys_path)
        app_path = pjoin(app_dir, 'extensions', '*python-tests*.tgz')
        assert not glob.glob(app_path)
        assert '@jupyterlab/python-tests' in list_extensions(app_dir)

        install_extension(self.source_dir, app_dir)
        assert glob.glob(app_path)
        assert '@jupyterlab/python-tests' in list_extensions(app_dir)

        uninstall_extension('@jupyterlab/python-tests', app_dir)
        assert not glob.glob(app_path)
        assert glob.glob(sys_path)
        assert '@jupyterlab/python-tests' in list_extensions(app_dir)

        uninstall_extension('@jupyterlab/python-tests', app_dir)
        assert not glob.glob(app_path)
        assert not glob.glob(sys_path)
        assert '@jupyterlab/python-tests' not in list_extensions(app_dir)

    def test_build(self):
        install_extension(self.source_dir)
        build()
        # check staging directory.
        entry = pjoin(get_app_dir(), 'staging', 'build', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert '@jupyterlab/python-tests' in data

        # check static directory.
        entry = pjoin(get_app_dir(), 'static', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert '@jupyterlab/python-tests' in data

    def test_load_extension(self):
        app = NotebookApp()
        stderr = sys.stderr
        sys.stderr = self.devnull
        app.initialize()
        sys.stderr = stderr
        load_jupyter_server_extension(app)
