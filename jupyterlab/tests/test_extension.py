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

from jupyterlab import labextensions
from jupyterlab.extension import (
    add_handlers, get_labconfig, load_jupyter_server_extension
)
from jupyterlab.labextensions import (
    enable_labextension_python, disable_labextension_python,
    install_labextension_python, CONFIG_DIR
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
        self.system_data_dir = os.path.join(self.test_dir, 'system_data')
        self.system_config_dir = os.path.join(self.test_dir, 'system_config')
        self.system_path = [self.system_data_dir]
        self.system_config_path = [self.system_config_dir]

        self.system_labext = os.path.join(self.system_data_dir, 'labextensions')

        self.patches = []
        p = patch.dict('os.environ', {
            'JUPYTER_CONFIG_DIR': self.config_dir,
            'JUPYTER_DATA_DIR': self.data_dir,
        })
        self.patches.append(p)
        for mod in (paths, labextensions):
            p = patch.object(mod,
                'SYSTEM_JUPYTER_PATH', self.system_path)
            self.patches.append(p)
            p = patch.object(mod,
                'ENV_JUPYTER_PATH', [])
            self.patches.append(p)
        for mod in (paths, labextensions):
            p = patch.object(mod,
                'SYSTEM_CONFIG_PATH', self.system_config_path)
            self.patches.append(p)
            p = patch.object(mod,
                'ENV_CONFIG_PATH', [])
            self.patches.append(p)
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

        # verify our patches
        self.assertEqual(paths.jupyter_config_path(), [self.config_dir] + self.system_config_path)
        self.assertEqual(labextensions._get_config_dir(user=False), os.path.join(self.system_config_dir, CONFIG_DIR))
        self.assertEqual(paths.jupyter_path(), [self.data_dir] + self.system_path)

    def tearDown(self):
        for modulename in self._mock_extensions:
            sys.modules.pop(modulename)

    def _mock_extension_spec_meta(self, name):
        return {
            'name': name,
            'src': os.path.join(self.src, name, 'build')
        }

    def _inject_mock_extension(self, name='mockextension'):
        outer_file = __file__

        meta = self._mock_extension_spec_meta(name)

        touch(meta['src'])

        class mock():
            __file__ = outer_file

            @staticmethod
            def _jupyter_labextension_paths():
                return [meta]

            @staticmethod
            def _jupyter_labextension_config():
                return dict(mockextension_foo=1)

        import sys
        sys.modules[name] = mock
        self._mock_extensions.append(name)

    def test_get_labconfig(self):
        # enabled at sys level
        self._inject_mock_extension('mockext_sys')
        install_labextension_python('mockext_sys', user=False)
        # enabled at sys, disabled at user
        self._inject_mock_extension('mockext_both')
        install_labextension_python('mockext_both', user=False)
        install_labextension_python('mockext_both', user=True)
        # enabled at user
        self._inject_mock_extension('mockext_user')
        install_labextension_python('mockext_user', user=True)

        enable_labextension_python('mockext_sys', user=False)
        enable_labextension_python('mockext_user', user=True)
        enable_labextension_python('mockext_both', user=False)
        disable_labextension_python('mockext_both', user=True)

        app = NotebookApp()
        config = get_labconfig(app).get('labextensions')

        assert config['mockext_user']['enabled']
        assert config['mockext_sys']['enabled']
        assert not config['mockext_both']['enabled']

    def test_add_handlers(self):
        app = NotebookApp()
        stderr = sys.stderr
        sys.stderr = self.devnull
        app.initialize()
        sys.stderr = stderr
        web_app = app.web_app
        prev = len(web_app.handlers)
        add_handlers(web_app, {})
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
