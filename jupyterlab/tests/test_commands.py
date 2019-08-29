"""Test yarn registry replacement"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import logging
import os
from os.path import join as pjoin
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

from jupyter_core import paths

from jupyterlab import commands


class Test_AppHandler(TestCase):

    def tempdir(self):
        td = TemporaryDirectory()
        self.tempdirs.append(td)
        return td.name

    def setUp(self):
        # Any TemporaryDirectory objects appended to this list will be cleaned
        # up at the end of the test run.
        self.tempdirs = []

        @self.addCleanup
        def cleanup_tempdirs():
            for d in self.tempdirs:
                d.cleanup()

        self.test_dir = self.tempdir()

        self.data_dir = pjoin(self.test_dir, 'data')
        self.config_dir = pjoin(self.test_dir, 'config')

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
            os.path.realpath(commands.get_app_dir()),
            os.path.realpath(pjoin(self.data_dir, 'lab'))
        )

        self.app_dir = commands.get_app_dir()
    
    def test_yarn_config(self):
        with patch("subprocess.check_output") as check_output:
            yarn_registry = "https://private.yarn/manager"
            check_output.return_value = b'\n'.join([
                b'{"type":"info","data":"yarn config"}',
                b'{"type":"inspect","data":{"registry":"' + bytes(yarn_registry, 'utf-8') + b'"}}',
                b'{"type":"info","data":"npm config"}',
                b'{"type":"inspect","data":{"registry":"' + bytes(yarn_registry, 'utf-8') + b'"}}'
            ])
            logger = logging.getLogger('jupyterlab')
            config = commands._yarn_config(logger)
            
            self.assertDictEqual(config, 
                {"yarn config": {"registry": yarn_registry}, 
                "npm config": {"registry": yarn_registry}}
            )

    def test_populate_staging(self):
        yarn_registry = "https://private.yarn/manager"
        staging = pjoin(self.app_dir, 'staging')
        handler = commands._AppHandler(self.app_dir, registry=yarn_registry)
        handler._populate_staging()

        lock_path = pjoin(staging, 'yarn.lock')
        with open(lock_path) as f:
            lock = f.read()

        self.assertNotIn(commands.YARN_DEFAULT_REGISTRY, lock)
        self.assertIn(yarn_registry, lock)
