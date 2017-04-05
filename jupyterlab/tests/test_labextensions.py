# coding: utf-8
"""Test installation of JupyterLab extensions"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import glob
import os
import sys
from io import StringIO
from os.path import join as pjoin
from subprocess import check_call, PIPE
from traitlets.tests.utils import check_help_all_output
from unittest import TestCase

try:
    from unittest.mock import patch
except ImportError:
    from mock import patch  # py2

import pytest
from ipython_genutils import py3compat
from ipython_genutils.tempdir import TemporaryDirectory
from jupyter_core import paths

from jupyterlab import labextensions
from jupyterlab.labextensions import (
    install_labextension, check_labextension,
    enable_labextension, disable_labextension,
    install_labextension_python, uninstall_labextension_python,
    enable_labextension_python, disable_labextension_python,
    find_labextension, validate_labextension_folder,
    get_labextension_config_python,
    get_labextension_manifest_data_by_name,
    get_labextension_manifest_data_by_folder,
    _read_config_data, CONFIG_DIR
)


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
    check_call(cmd.split(), shell=shell, cwd=cwd, stdout=PIPE)


class TestInstallLabExtension(TestCase):

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
        self._mock_extensions = []

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
        install_labextension(self.src, self.name, user=True)
        self.assert_installed(self.name, user=True)
    
    def test_create_labextensions_system(self):
        with TemporaryDirectory() as td:
            with patch.object(labextensions, 'SYSTEM_JUPYTER_PATH', [td]):
                self.system_labext = pjoin(td, u'labextensions')
                install_labextension(self.src, self.name, user=False)
                self.assert_installed(self.name, user=False)
    
    def test_find_labextension_user(self):
        install_labextension(self.src, self.name, user=True)
        path = find_labextension(self.name)
        self.assertEqual(path, pjoin(self.data_dir, u'labextensions', self.name))

    def test_find_labextension_system(self):
        install_labextension(self.src, self.name, user=False)
        path = find_labextension(self.name)
        self.assertEqual(path, pjoin(self.system_labext, self.name))

    def test_labextension_find_bad(self):
        path = find_labextension("this-doesn't-exist")
        self.assertEqual(path, None)

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

    @pytest.mark.skipif(os.name == 'nt',
                        reason="Symlinks are not supported on win32")
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

        data = _read_config_data('labextensions', user=True)
        config = data.get(self.name, {})
        assert config['enabled']
        assert 'python_module' not in config

    def test_labextension_disable(self):
        self.test_labextension_enable()
        disable_labextension(self.name)

        data = _read_config_data('labextensions', user=True)
        config = data.get(self.name, {})
        assert not config['enabled']
        assert 'python_module' not in config

    def _mock_extension_spec_meta(self, name):
        return {
            'name': name,
            'src': '%s/build' % name,
        }

    def _inject_mock_extension(self, name='mockextension'):
        outer_file = __file__

        meta = self._mock_extension_spec_meta(name)

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
        
        data = _read_config_data('labextensions', user=True)
        config = data.get('mockextension', False)
        assert config['enabled'] == True
        assert config['python_module'] == 'mockextension'
        
    def test_labextensionpy_disable(self):
        self._inject_mock_extension()
        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')
        disable_labextension_python('mockextension', user=True)
        
        data = _read_config_data('labextensions', user=True)
        config = data.get('mockextension', {})
        assert not config['enabled']

    def test_labextensionpy_validate(self):
        self._inject_mock_extension()

        paths = install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')

        meta = self._mock_extension_spec_meta('mockextension')
        warnings = validate_labextension_folder(meta['name'], paths[0])
        self.assertEqual([], warnings, warnings)

    def test_labextensionpy_config(self):
        self._inject_mock_extension()

        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')

        config = get_labextension_config_python('mockextension')
        assert config['mockextension_foo'] == 1

    def test_get_labextension_manifest_data_by_name(self):
        self._inject_mock_extension()

        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')

        manifest = get_labextension_manifest_data_by_name('mockextension')
        self.check_manifest(manifest)

    def test_get_labextension_manifest_data_by_folder(self):
        self._inject_mock_extension()

        path = install_labextension_python('mockextension', user=True)[0]
        enable_labextension_python('mockextension')

        manifest = get_labextension_manifest_data_by_folder(path)
        self.check_manifest(manifest)

    def check_manifest(self, manifest):
        assert 'mockextension' in manifest
        mod = manifest['mockextension']
        assert mod['name'] == 'mockextension'
        modname = '@jupyterlab/python-tests@0.1.0/mockextension/index.js'
        assert modname in mod['entry']
        filename = 'mockextension.bundle.js'
        assert mod['files'][0] == filename
        assert mod['id'] == 0
        assert len(mod['hash']) == 32
        assert len(mod['modules']) == 1
