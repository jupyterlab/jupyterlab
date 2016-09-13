# coding: utf-8
"""Test installation of JupyterLab extensions"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import glob
import os
import sys
from io import StringIO
from os.path import join as pjoin
from subprocess import check_call
from traitlets.tests.utils import check_help_all_output
from unittest import TestCase

try:
    from unittest.mock import patch
except ImportError:
    from mock import patch # py2

import ipython_genutils.testing.decorators as dec
from ipython_genutils import py3compat
from ipython_genutils.tempdir import TemporaryDirectory
from jupyterlab import labextensions
from jupyterlab.labextensions import (install_labextension, check_labextension,
    enable_labextension, disable_labextension,
    install_labextension_python, uninstall_labextension_python,
    enable_labextension_python, disable_labextension_python, _get_config_dir,
    validate_labextension, validate_labextension_folder
)

from traitlets.config.manager import BaseJSONConfigManager


FILENAME = 'mockextension/mockextension.bundle.js'


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


def test_help_output():
    check_help_all_output('jupyterlab.labextensions')
    check_help_all_output('jupyterlab.labextensions', ['enable'])
    check_help_all_output('jupyterlab.labextensions', ['disable'])
    check_help_all_output('jupyterlab.labextensions', ['install'])
    check_help_all_output('jupyterlab.labextensions', ['uninstall'])


def build_extension():
    shell = (sys.platform == 'win32')
    cwd = os.path.dirname(os.path.abspath(__file__))
    cmd = 'node build_extension.js'
    check_call(cmd.split(), shell=shell, cwd=cwd)


class TestInstallNBExtension(TestCase):

    @classmethod
    def setUpClass(cls):
        # Build the extension
        build_extension()

    def tempdir(self):
        td = TemporaryDirectory()
        self.tempdirs.append(td)
        return py3compat.cast_unicode(td.name)

    def setUp(self):
        # Any TemporaryDirectory objects appended to this list will be cleaned
        # up at the end of the test run.
        self.tempdirs = []

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
        self.system_path = [self.system_data_dir]
        self.system_labext = os.path.join(self.system_data_dir, 'labextensions')

        # Patch out os.environ so that tests are isolated from the real OS
        # environment.
        self.patch_env = patch.dict('os.environ', {
            'JUPYTER_CONFIG_DIR': self.config_dir,
            'JUPYTER_DATA_DIR': self.data_dir,
        })
        self.patch_env.start()
        self.addCleanup(self.patch_env.stop)

        # Patch out the system path os that we consistently use our own
        # temporary directory instead.
        self.patch_system_path = patch.object(
            labextensions, 'SYSTEM_JUPYTER_PATH', self.system_path
        )
        self.patch_system_path.start()
        self.addCleanup(self.patch_system_path.stop)

    def assert_dir_exists(self, path):
        if not os.path.exists(path):
            do_exist = os.listdir(os.path.dirname(path))
            self.fail(u"%s should exist (found %s)" % (path, do_exist))
    
    def assert_not_dir_exists(self, path):
        if os.path.exists(path):
            self.fail(u"%s should not exist" % path)
    
    def assert_installed(self, relative_path, user=False):
        if user:
            labext = pjoin(self.data_dir, u'labextensions')
        else:
            labext = self.system_labext
        self.assert_dir_exists(
            pjoin(labext, relative_path)
        )
    
    def assert_not_installed(self, relative_path, user=False):
        if user:
            labext = pjoin(self.data_dir, u'labextensions')
        else:
            labext = self.system_labext
        self.assert_not_dir_exists(
            pjoin(labext, relative_path)
        )
    
    def test_create_labextensions_user(self):
        with TemporaryDirectory() as td:
            install_labextension(self.src, self.name, user=True)
            self.assert_installed(
                pjoin(self.name),
                user=True
            )
    
    def test_create_labextensions_system(self):
        with TemporaryDirectory() as td:
            self.system_labext = pjoin(td, u'labextensions')
            with patch.object(labextensions, 'SYSTEM_JUPYTER_PATH', [td]):
                install_labextension(self.src, self.name, user=False)
                self.assert_installed(
                    pjoin(self.name),
                    user=False
                )
    
    def test_install_labextension(self):
        with self.assertRaises(TypeError):
            install_labextension(glob.glob(pjoin(self.src, '*')), self.name)

    def test_quiet(self):
        stdout = StringIO()
        stderr = StringIO()
        with patch.object(sys, 'stdout', stdout), \
             patch.object(sys, 'stderr', stderr):
            install_labextension(self.src, self.name)
        self.assertEqual(stdout.getvalue(), '')
        self.assertEqual(stderr.getvalue(), '')
    
    def test_check_labextension(self):
        with TemporaryDirectory() as d:
            f = u'ƒ.js'
            src = pjoin(d, self.name, 'build')
            touch(pjoin(src, f))
            install_labextension(src, self.name, user=True)
        
        f = pjoin(self.name, f)
        assert check_labextension(f, user=True)
        assert check_labextension([f], user=True)
        assert not check_labextension([f, pjoin('dne', f)], user=True)

    @dec.skip_win32
    def test_install_symlink(self):
        with TemporaryDirectory() as d:
            f = u'ƒ.js'
            src = pjoin(d, f)
            touch(src)
            install_labextension(d, self.name, symlink=True)
        dest = pjoin(self.system_labext, self.name)
        assert os.path.islink(dest)
        link = os.readlink(dest)
        self.assertEqual(link, d)

    def test_labextension_enable(self):
        with TemporaryDirectory() as d:
            f = u'ƒ.js'
            src = pjoin(d, f)
            touch(src)
            install_labextension(src, self.name, user=True)
            enable_labextension(self.name)
        
        config_dir = os.path.join(_get_config_dir(user=True), 'labconfig')
        cm = BaseJSONConfigManager(config_dir=config_dir)
        enabled = cm.get('jupyterlab_config').get('LabApp', {}).get('labextensions', {}).get(self.name, False)
        assert enabled
    
    def test_labextension_disable(self):
        self.test_labextension_enable()
        disable_labextension(self.name)
        
        config_dir = os.path.join(_get_config_dir(user=True), 'labconfig')
        cm = BaseJSONConfigManager(config_dir=config_dir)
        enabled = cm.get('jupytlab_config').get('LabApp', {}).get('labextensions', {}).get(self.name, False)
        assert not enabled
        

    def _mock_extension_spec_meta(self):
        return {
            'name': 'mockextension',
            'src': 'mockextension/build',
        }

    def _inject_mock_extension(self):
        outer_file = __file__

        meta = self._mock_extension_spec_meta()

        class mock():
            __file__ = outer_file
            
            @staticmethod
            def _jupyter_labextension_paths():
                return [meta]
        
        import sys
        sys.modules['mockextension'] = mock
        
    def test_labextensionpy_files(self):
        self._inject_mock_extension()
        install_labextension_python('mockextension')
        
        assert check_labextension(FILENAME)
        assert check_labextension([FILENAME])
        
    def test_labextensionpy_user_files(self):
        self._inject_mock_extension()
        install_labextension_python('mockextension', user=True)
        
        assert check_labextension(FILENAME, user=True)
        assert check_labextension([FILENAME], user=True)
        
    def test_labextensionpy_uninstall_files(self):
        self._inject_mock_extension()
        install_labextension_python('mockextension', user=True)
        uninstall_labextension_python('mockextension', user=True)
        
        assert not check_labextension(FILENAME)
        assert not check_labextension([FILENAME])
        
    def test_labextensionpy_enable(self):
        self._inject_mock_extension()
        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')
        
        config_dir = os.path.join(_get_config_dir(user=True), 'labconfig')
        cm = BaseJSONConfigManager(config_dir=config_dir)
        enabled = cm.get('jupyterlab_config').get('LabApp', {}).get('labextensions', {}).get('mockextension', False)
        assert enabled
        
    def test_labextensionpy_disable(self):
        self._inject_mock_extension()
        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')
        disable_labextension_python('mockextension', user=True)
        
        config_dir = os.path.join(_get_config_dir(user=True), 'labconfig')
        cm = BaseJSONConfigManager(config_dir=config_dir)
        enabled = cm.get('jupyterlab_config').get('LabApp', {}).get('labextensions', {}).get('mockextension', False)
        assert not enabled

    def test_labextensionpy_validate(self):
        self._inject_mock_extension()

        paths = install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')

        meta = self._mock_extension_spec_meta()
        warnings = validate_labextension_folder(meta['name'], paths[0])
        self.assertEqual([], warnings, warnings)

    def test_labextension_validate(self):
        # Break the metadata (correct file will still be copied)
        self._inject_mock_extension()

        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')

        warnings = validate_labextension("mockextension")
        self.assertEqual([], warnings, warnings)

    def test_labextension_validate_bad(self):
        warnings = validate_labextension("this-doesn't-exist")
        self.assertNotEqual([], warnings, warnings)

