# coding: utf-8
"""Test installation of notebook extensions"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import glob
import os
import sys
import tarfile
import zipfile
from io import BytesIO, StringIO
from os.path import basename, join as pjoin
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
    validate_labextension, validate_labextension_python
)

from traitlets.config.manager import BaseJSONConfigManager


def touch(file, mtime=None):
    """ensure a file exists, and set its modification time
    
    returns the modification time of the file
    """
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


class TestInstallLabExtension(TestCase):
    
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
    
    def test_create_data_dir(self):
        """install_labextension when data_dir doesn't exist"""
        with TemporaryDirectory() as td:
            data_dir = os.path.join(td, self.data_dir)
            with patch.dict('os.environ', {
                'JUPYTER_DATA_DIR': data_dir,
            }):
                install_labextension(self.src, user=True)
                self.assert_dir_exists(data_dir)
                for file in self.files:
                    self.assert_installed(
                        pjoin(basename(self.src), file),
                        user=True,
                    )
    
    def test_create_labextensions_user(self):
        with TemporaryDirectory() as td:
            install_labextension(self.src, user=True)
            self.assert_installed(
                pjoin(basename(self.src), u'ƒile'),
                user=True
            )
    
    def test_create_labextensions_system(self):
        with TemporaryDirectory() as td:
            self.system_labext = pjoin(td, u'labextensions')
            with patch.object(labextensions, 'SYSTEM_JUPYTER_PATH', [td]):
                install_labextension(self.src, user=False)
                self.assert_installed(
                    pjoin(basename(self.src), u'ƒile'),
                    user=False
                )
    
    def test_single_file(self):
        file = self.files[0]
        install_labextension(pjoin(self.src, file))
        self.assert_installed(file)
    
    def test_single_dir(self):
        d = u'∂ir'
        install_labextension(pjoin(self.src, d))
        self.assert_installed(self.files[-1])
    

    def test_destination_file(self):
        file = self.files[0]
        install_labextension(pjoin(self.src, file), destination = u'ƒiledest')
        self.assert_installed(u'ƒiledest')

    def test_destination_dir(self):
        d = u'∂ir'
        install_labextension(pjoin(self.src, d), destination = u'ƒiledest2')
        self.assert_installed(pjoin(u'ƒiledest2', u'∂ir2', u'ƒile2'))
    
    def test_install_labextension(self):
        with self.assertRaises(TypeError):
            install_labextension(glob.glob(pjoin(self.src, '*')))
    
    def test_overwrite_file(self):
        with TemporaryDirectory() as d:
            fname = u'ƒ.js'
            src = pjoin(d, fname)
            with open(src, 'w') as f:
                f.write('first')
            mtime = touch(src)
            dest = pjoin(self.system_labext, fname)
            install_labextension(src)
            with open(src, 'w') as f:
                f.write('overwrite')
            mtime = touch(src, mtime - 100)
            install_labextension(src, overwrite=True)
            with open(dest) as f:
                self.assertEqual(f.read(), 'overwrite')
    
    def test_overwrite_dir(self):
        with TemporaryDirectory() as src:
            base = basename(src)
            fname = u'ƒ.js'
            touch(pjoin(src, fname))
            install_labextension(src)
            self.assert_installed(pjoin(base, fname))
            os.remove(pjoin(src, fname))
            fname2 = u'∂.js'
            touch(pjoin(src, fname2))
            install_labextension(src, overwrite=True)
            self.assert_installed(pjoin(base, fname2))
            self.assert_not_installed(pjoin(base, fname))
    
    def test_update_file(self):
        with TemporaryDirectory() as d:
            fname = u'ƒ.js'
            src = pjoin(d, fname)
            with open(src, 'w') as f:
                f.write('first')
            mtime = touch(src)
            install_labextension(src)
            self.assert_installed(fname)
            dest = pjoin(self.system_labext, fname)
            os.stat(dest).st_mtime
            with open(src, 'w') as f:
                f.write('overwrite')
            touch(src, mtime + 10)
            install_labextension(src)
            with open(dest) as f:
                self.assertEqual(f.read(), 'overwrite')
    
    def test_skip_old_file(self):
        with TemporaryDirectory() as d:
            fname = u'ƒ.js'
            src = pjoin(d, fname)
            mtime = touch(src)
            install_labextension(src)
            self.assert_installed(fname)
            dest = pjoin(self.system_labext, fname)
            old_mtime = os.stat(dest).st_mtime
            
            mtime = touch(src, mtime - 100)
            install_labextension(src)
            new_mtime = os.stat(dest).st_mtime
            self.assertEqual(new_mtime, old_mtime)

    def test_quiet(self):
        stdout = StringIO()
        stderr = StringIO()
        with patch.object(sys, 'stdout', stdout), \
             patch.object(sys, 'stderr', stderr):
            install_labextension(self.src)
        self.assertEqual(stdout.getvalue(), '')
        self.assertEqual(stderr.getvalue(), '')
    
    def test_check_labextension(self):
        with TemporaryDirectory() as d:
            f = u'ƒ.js'
            src = pjoin(d, f)
            touch(src)
            install_labextension(src, user=True)
        
        assert check_labextension(f, user=True)
        assert check_labextension([f], user=True)
        assert not check_labextension([f, pjoin('dne', f)], user=True)
    
    @dec.skip_win32
    def test_install_symlink(self):
        with TemporaryDirectory() as d:
            f = u'ƒ.js'
            src = pjoin(d, f)
            touch(src)
            install_labextension(src, symlink=True)
        dest = pjoin(self.system_labext, f)
        assert os.path.islink(dest)
        link = os.readlink(dest)
        self.assertEqual(link, src)
    
    @dec.skip_win32
    def test_overwrite_broken_symlink(self):
        with TemporaryDirectory() as d:
            f = u'ƒ.js'
            f2 = u'ƒ2.js'
            src = pjoin(d, f)
            src2 = pjoin(d, f2)
            touch(src)
            install_labextension(src, symlink=True)
            os.rename(src, src2)
            install_labextension(src2, symlink=True, overwrite=True, destination=f)
        dest = pjoin(self.system_labext, f)
        assert os.path.islink(dest)
        link = os.readlink(dest)
        self.assertEqual(link, src2)

    @dec.skip_win32
    def test_install_symlink_destination(self):
        with TemporaryDirectory() as d:
            f = u'ƒ.js'
            flink = u'ƒlink.js'
            src = pjoin(d, f)
            touch(src)
            install_labextension(src, symlink=True, destination=flink)
        dest = pjoin(self.system_labext, flink)
        assert os.path.islink(dest)
        link = os.readlink(dest)
        self.assertEqual(link, src)

    def test_install_symlink_bad(self):
        with self.assertRaises(ValueError):
            install_labextension("http://example.com/foo.js", symlink=True)
        
        with TemporaryDirectory() as d:
            zf = u'ƒ.zip'
            zsrc = pjoin(d, zf)
            with zipfile.ZipFile(zsrc, 'w') as z:
                z.writestr("a.js", b"b();")
        
            with self.assertRaises(ValueError):
                install_labextension(zsrc, symlink=True)

    def test_install_destination_bad(self):
        with TemporaryDirectory() as d:
            zf = u'ƒ.zip'
            zsrc = pjoin(d, zf)
            with zipfile.ZipFile(zsrc, 'w') as z:
                z.writestr("a.js", b"b();")
        
            with self.assertRaises(ValueError):
                install_labextension(zsrc, destination='foo')

    def test_labextension_enable(self):
        with TemporaryDirectory() as d:
            f = u'ƒ.js'
            src = pjoin(d, f)
            touch(src)
            install_labextension(src, user=True)
            enable_labextension(section='notebook', require=u'ƒ')
        
        config_dir = os.path.join(_get_config_dir(user=True), 'nbconfig')
        cm = BaseJSONConfigManager(config_dir=config_dir)
        enabled = cm.get('notebook').get('load_extensions', {}).get(u'ƒ', False)
        assert enabled
    
    def test_labextension_disable(self):
        self.test_labextension_enable()
        disable_labextension(section='notebook', require=u'ƒ')
        
        config_dir = os.path.join(_get_config_dir(user=True), 'nbconfig')
        cm = BaseJSONConfigManager(config_dir=config_dir)
        enabled = cm.get('notebook').get('load_extensions', {}).get(u'ƒ', False)
        assert not enabled
        

    def _mock_extension_spec_meta(self, section='notebook'):
        return {
            'name': 'mockextension',
            'src': 'mockextension',
        }

    def _inject_mock_extension(self, section='notebook'):
        outer_file = __file__

        meta = self._mock_extension_spec_meta(section)

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
        
        assert check_labextension('_mockdestination/index.js')
        assert check_labextension(['_mockdestination/index.js'])
        
    def test_labextensionpy_user_files(self):
        self._inject_mock_extension()
        install_labextension_python('mockextension', user=True)
        
        assert check_labextension('_mockdestination/index.js', user=True)
        assert check_labextension(['_mockdestination/index.js'], user=True)
        
    def test_labextensionpy_uninstall_files(self):
        self._inject_mock_extension()
        install_labextension_python('mockextension', user=True)
        uninstall_labextension_python('mockextension', user=True)
        
        assert not check_labextension('_mockdestination/index.js')
        assert not check_labextension(['_mockdestination/index.js'])
        
    def test_labextensionpy_enable(self):
        self._inject_mock_extension('notebook')
        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')
        
        config_dir = os.path.join(_get_config_dir(user=True), 'nbconfig')
        cm = BaseJSONConfigManager(config_dir=config_dir)
        enabled = cm.get('notebook').get('load_extensions', {}).get('_mockdestination/index', False)
        assert enabled
        
    def test_labextensionpy_disable(self):
        self._inject_mock_extension('notebook')
        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')
        disable_labextension_python('mockextension', user=True)
        
        config_dir = os.path.join(_get_config_dir(user=True), 'nbconfig')
        cm = BaseJSONConfigManager(config_dir=config_dir)
        enabled = cm.get('notebook').get('load_extensions', {}).get('_mockdestination/index', False)
        assert not enabled

    def test_labextensionpy_validate(self):
        self._inject_mock_extension('notebook')

        paths = install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')

        meta = self._mock_extension_spec_meta()
        warnings = validate_labextension_python(meta, paths[0])
        self.assertEqual([], warnings, warnings)

    def test_labextensionpy_validate_bad(self):
        # Break the metadata (correct file will still be copied)
        self._inject_mock_extension('notebook')

        paths = install_labextension_python('mockextension', user=True)

        enable_labextension_python('mockextension')

        meta = self._mock_extension_spec_meta()
        meta.update(require="bad-require")

        warnings = validate_labextension_python(meta, paths[0])
        self.assertNotEqual([], warnings, warnings)

    def test_labextension_validate(self):
        # Break the metadata (correct file will still be copied)
        self._inject_mock_extension('notebook')

        install_labextension_python('mockextension', user=True)
        enable_labextension_python('mockextension')

        warnings = validate_labextension("_mockdestination/index")
        self.assertEqual([], warnings, warnings)

    def test_labextension_validate_bad(self):
        warnings = validate_labextension("this-doesn't-exist")
        self.assertNotEqual([], warnings, warnings)

