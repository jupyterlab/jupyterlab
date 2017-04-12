# coding: utf-8
"""Test installation of JupyterLab extensions"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

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

from jupyterlab import extension, commands
from jupyterlab.extension import (
    add_handlers, load_jupyter_server_extension
)
from jupyterlab.commands import (
    install_extension, uninstall_extension, list_extensions,
    link_extension, build
)


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

        self.src = self.tempdir()
        self.name = 'mockextension'
        self.files = files = [
            pjoin(u'ƒile'),
            pjoin(u'∂ir', u'ƒile1'),
            pjoin(u'∂ir', u'∂ir2', u'ƒile2'),
        ]
        for file in files:
            fullpath = os.path.join(self.src, file)
            parent = os.path.dirname(fullpath)
            if not os.path.exists(parent):
                os.makedirs(parent)
            touch(fullpath)

        self.test_dir = self.tempdir()
        self.data_dir = os.path.join(self.test_dir, 'data')
        self.config_dir = os.path.join(self.test_dir, 'config')

        self.patches = []
        p = patch.dict('os.environ', {
            'JUPYTER_CONFIG_DIR': self.config_dir,
            'JUPYTER_DATA_DIR': self.data_dir,
        })
        self.patches.append(p)
        for mod in (paths, extension, commands):
            if hasattr(mod, 'ENV_JUPYTER_PATH'):
                p = patch.object(mod, 'ENV_JUPYTER_PATH', [self.data_dir])
                self.patches.append(p)
            if hasattr(mod, 'ENV_CONFIG_PATH'):
                p = patch.object(mod, 'ENV_CONFIG_PATH', [self.config_dir])
                self.patches.append(p)
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

        # verify our patches
        self.assertEqual(paths.ENV_CONFIG_PATH, [self.config_dir])
        self.assertEqual(paths.ENV_JUPYTER_PATH, [self.data_dir])
        self.assertEqual(extension.ENV_JUPYTER_PATH, [self.data_dir])
        self.assertEqual(commands.ENV_CONFIG_PATH, [self.config_dir])
        self.assertEqual(commands.ENV_JUPYTER_PATH, [self.data_dir])

    def tearDown(self):
        for modulename in self._mock_extensions:
            sys.modules.pop(modulename)

    def test_install_extension(self):
        pass

    def test_uninstall_extension(self):
        pass

    def test_list_extensions(self):
        pass

    def test_link_extension(self):
        pass

    def test_build(self):
        pass

    def test_add_handlers(self):
        app = NotebookApp()
        stderr = sys.stderr
        sys.stderr = self.devnull
        app.initialize()
        sys.stderr = stderr
        web_app = app.web_app
        prev = len(web_app.handlers)
        add_handlers(web_app)
        assert len(web_app.handlers) > prev

    def test_load_extension(self):
        app = NotebookApp()
        stderr = sys.stderr
        sys.stderr = self.devnull
        app.initialize()
        sys.stderr = stderr
        web_app = app.web_app
        prev = len(web_app.handlers)
        load_jupyter_server_extension(app)
        assert len(web_app.handlers) > prev
