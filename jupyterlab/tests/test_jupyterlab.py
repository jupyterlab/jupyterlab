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
    check_extension, _test_overlap, _get_core_data,
    update_extension,
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
        assert install_extension(self.mock_extension) is True
        path = pjoin(self.app_dir, 'extensions', '*.tgz')
        assert glob.glob(path)
        extensions = get_app_info(self.app_dir)['extensions']
        name = self.pkg_names['extension']
        assert name in extensions
        assert check_extension(name)

    def test_install_twice(self):
        assert install_extension(self.mock_extension) is True
        path = pjoin(commands.get_app_dir(), 'extensions', '*.tgz')
        assert install_extension(self.mock_extension) is True
        assert glob.glob(path)
        extensions = get_app_info(self.app_dir)['extensions']
        name = self.pkg_names['extension']
        assert name in extensions
        assert check_extension(name)

    def test_install_mime_renderer(self):
        install_extension(self.mock_mimeextension)
        name = self.pkg_names['mimeextension']
        assert name in get_app_info(self.app_dir)['extensions']
        assert check_extension(name)

        assert uninstall_extension(name) is True
        assert name not in get_app_info(self.app_dir)['extensions']
        assert not check_extension(name)

    def test_install_incompatible(self):
        with pytest.raises(ValueError) as excinfo:
            install_extension(self.mock_incompat)
        assert 'Conflicting Dependencies' in str(excinfo.value)
        assert not check_extension(self.pkg_names["incompat"])

    def test_install_failed(self):
        path = self.mock_package
        with pytest.raises(ValueError):
            install_extension(path)
        with open(pjoin(path, 'package.json')) as fid:
            data = json.load(fid)
        extensions = get_app_info(self.app_dir)['extensions']
        name = data['name']
        assert name not in extensions
        assert not check_extension(name)

    def test_validation(self):
        path = self.mock_extension
        os.remove(pjoin(path, 'index.js'))
        with pytest.raises(ValueError):
            install_extension(path)
        assert not check_extension(self.pkg_names["extension"])

        path = self.mock_mimeextension
        os.remove(pjoin(path, 'index.js'))
        with pytest.raises(ValueError):
            install_extension(path)
        assert not check_extension(self.pkg_names["mimeextension"])

    def test_uninstall_extension(self):
        assert install_extension(self.mock_extension) is True
        name = self.pkg_names['extension']
        assert check_extension(name)
        assert uninstall_extension(self.pkg_names['extension']) is True
        path = pjoin(self.app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(self.app_dir)['extensions']
        assert name not in extensions
        assert not check_extension(name)

    def test_uninstall_core_extension(self):
        assert uninstall_extension('@jupyterlab/console-extension') is True
        app_dir = self.app_dir
        build(app_dir)
        with open(pjoin(app_dir, 'staging', 'package.json')) as fid:
            data = json.load(fid)
        extensions = data['jupyterlab']['extensions']
        assert '@jupyterlab/console-extension' not in extensions
        assert not check_extension('@jupyterlab/console-extension')

        assert install_extension('@jupyterlab/console-extension') is True
        build(app_dir)
        with open(pjoin(app_dir, 'staging', 'package.json')) as fid:
            data = json.load(fid)
        extensions = data['jupyterlab']['extensions']
        assert '@jupyterlab/console-extension' in extensions
        assert check_extension('@jupyterlab/console-extension')

    def test_link_extension(self):
        path = self.mock_extension
        name = self.pkg_names['extension']
        link_package(path)
        app_dir = self.app_dir
        linked = get_app_info(app_dir)['linked_packages']
        assert name not in linked
        assert name in get_app_info(app_dir)['extensions']
        assert check_extension(name)
        assert unlink_package(path) is True
        linked = get_app_info(app_dir)['linked_packages']
        assert name not in linked
        assert name not in get_app_info(app_dir)['extensions']
        assert not check_extension(name)

    def test_link_package(self):
        path = self.mock_package
        name = self.pkg_names['package']
        assert link_package(path) is True
        app_dir = self.app_dir
        linked = get_app_info(app_dir)['linked_packages']
        assert name in linked
        assert name not in get_app_info(app_dir)['extensions']
        assert check_extension(name)
        assert unlink_package(path)
        linked = get_app_info(app_dir)['linked_packages']
        assert name not in linked
        assert not check_extension(name)

    def test_unlink_package(self):
        target = self.mock_package
        assert link_package(target) is True
        assert unlink_package(target) is True
        linked = get_app_info(self.app_dir)['linked_packages']
        name = self.pkg_names['package']
        assert name not in linked
        assert not check_extension(name)

    def test_list_extensions(self):
        assert install_extension(self.mock_extension) is True
        list_extensions()

    def test_app_dir(self):
        app_dir = self.tempdir()

        assert install_extension(self.mock_extension, app_dir) is True
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert glob.glob(path)
        extensions = get_app_info(app_dir)['extensions']
        ext_name = self.pkg_names['extension']
        assert ext_name in extensions
        assert check_extension(ext_name, app_dir)

        assert uninstall_extension(self.pkg_names['extension'], app_dir) is True
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(app_dir)['extensions']
        assert ext_name not in extensions
        assert not check_extension(ext_name, app_dir)

        assert link_package(self.mock_package, app_dir) is True
        linked = get_app_info(app_dir)['linked_packages']
        pkg_name = self.pkg_names['package']
        assert pkg_name in linked
        assert check_extension(pkg_name, app_dir)

        assert unlink_package(self.mock_package, app_dir) is True
        linked = get_app_info(app_dir)['linked_packages']
        assert pkg_name not in linked
        assert not check_extension(pkg_name, app_dir)

    def test_app_dir_use_sys_prefix(self):
        app_dir = self.tempdir()
        if os.path.exists(self.app_dir):
            os.removedirs(self.app_dir)

        assert install_extension(self.mock_extension) is True
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(app_dir)['extensions']
        ext_name = self.pkg_names['extension']
        assert ext_name in extensions
        assert check_extension(ext_name, app_dir)

    def test_app_dir_shadowing(self):
        app_dir = self.tempdir()
        sys_dir = self.app_dir
        if os.path.exists(sys_dir):
            os.removedirs(sys_dir)

        assert install_extension(self.mock_extension) is True
        sys_path = pjoin(sys_dir, 'extensions', '*.tgz')
        assert glob.glob(sys_path)
        app_path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(app_path)
        extensions = get_app_info(app_dir)['extensions']
        ext_name = self.pkg_names['extension']
        assert ext_name in extensions
        assert check_extension(ext_name, app_dir)

        assert install_extension(self.mock_extension, app_dir) is True
        assert glob.glob(app_path)
        extensions = get_app_info(app_dir)['extensions']
        assert ext_name in extensions
        assert check_extension(ext_name, app_dir)

        assert uninstall_extension(self.pkg_names['extension'], app_dir) is True
        assert not glob.glob(app_path)
        assert glob.glob(sys_path)
        extensions = get_app_info(app_dir)['extensions']
        assert ext_name in extensions
        assert check_extension(ext_name, app_dir)

        assert uninstall_extension(self.pkg_names['extension'], app_dir) is True
        assert not glob.glob(app_path)
        assert not glob.glob(sys_path)
        extensions = get_app_info(app_dir)['extensions']
        assert ext_name not in extensions
        assert not check_extension(ext_name, app_dir)

    def test_build(self):
        assert install_extension(self.mock_extension) is True
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
        assert install_extension(self.mock_extension) is True
        build(name='foo', version='1.0', public_url='bar')

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
        assert data['jupyterlab']['publicUrl'] == 'bar'

    def test_load_extension(self):
        app = NotebookApp()
        stderr = sys.stderr
        sys.stderr = self.devnull
        app.initialize(argv=[])
        sys.stderr = stderr
        load_jupyter_server_extension(app)

    def test_disable_extension(self):
        app_dir = self.tempdir()
        assert install_extension(self.mock_extension, app_dir) is True
        assert disable_extension(self.pkg_names['extension'], app_dir) is True
        info = get_app_info(app_dir)
        name = self.pkg_names['extension']
        assert name in info['disabled']
        assert not check_extension(name, app_dir)
        assert check_extension(name, app_dir, True)
        assert disable_extension('@jupyterlab/notebook-extension', app_dir) is True
        info = get_app_info(app_dir)
        assert '@jupyterlab/notebook-extension' in info['disabled']
        assert not check_extension('@jupyterlab/notebook-extension', app_dir)
        assert check_extension('@jupyterlab/notebook-extension', app_dir, True)
        assert name in info['disabled']
        assert not check_extension(name, app_dir)
        assert check_extension(name, app_dir, True)

    def test_enable_extension(self):
        app_dir = self.tempdir()
        assert install_extension(self.mock_extension, app_dir) is True
        assert disable_extension(self.pkg_names['extension'], app_dir) is True
        assert enable_extension(self.pkg_names['extension'], app_dir) is True
        info = get_app_info(app_dir)
        name = self.pkg_names['extension']
        assert name not in info['disabled']
        assert check_extension(name, app_dir)
        assert disable_extension('@jupyterlab/notebook-extension', app_dir) is True
        assert name not in info['disabled']
        assert check_extension(name, app_dir)
        assert '@jupyterlab/notebook-extension' not in info['disabled']
        assert not check_extension('@jupyterlab/notebook-extension', app_dir)

    def test_build_check(self):
        # Do the initial build.
        assert build_check()
        assert install_extension(self.mock_extension) is True
        assert link_package(self.mock_package) is True
        build()
        assert not build_check()

        # Check installed extensions.
        assert install_extension(self.mock_mimeextension) is True
        assert build_check()
        assert uninstall_extension(self.pkg_names['mimeextension']) is True
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

    def test_install_compatible(self):
        core_data = _get_core_data()
        current_app_dep = core_data['dependencies']['@jupyterlab/application']
        def _gen_dep(ver):
            return { "dependencies": {
                '@jupyterlab/application': ver
            }}
        def _mock_metadata(registry, name, logger):
            assert name == 'mockextension'
            return {
                "name": name,
                "versions": {
                    "0.9.0": _gen_dep(current_app_dep),
                    "1.0.0": _gen_dep(current_app_dep),
                    "1.1.0": _gen_dep(current_app_dep),
                    "2.0.0": _gen_dep('^2000.0.0'),
                    "2.0.0-b0": _gen_dep(current_app_dep),
                    "2.1.0-b0": _gen_dep('^2000.0.0'),
                    "2.1.0": _gen_dep('^2000.0.0'),
                }
            }

        def _mock_extract(self, source, tempdir, *args, **kwargs):
            data = dict(
                name=source, version='2.1.0',
                jupyterlab=dict(extension=True),
                jupyterlab_extracted_files=['index.js'],
            )
            data.update(_gen_dep('^2000.0.0'))
            info = dict(
                source=source, is_dir=False, data=data,
                name=source, version=data['version'],
                filename='mockextension.tgz',
                path=pjoin(tempdir, 'mockextension.tgz'),
            )
            return info

        class Success(Exception):
            pass

        def _mock_install(self, name, *args, **kwargs):
            assert name in ('mockextension', 'mockextension@1.1.0')
            if name == 'mockextension@1.1.0':
                raise Success()
            return orig_install(self, name, *args, **kwargs)

        p1 = patch.object(
            commands,
            '_fetch_package_metadata',
            _mock_metadata)
        p2 = patch.object(
            commands._AppHandler,
            '_extract_package',
            _mock_extract)
        p3 = patch.object(
            commands._AppHandler,
            '_install_extension',
            _mock_install)
        with p1, p2:
            orig_install = commands._AppHandler._install_extension
            with p3, pytest.raises(Success):
                assert install_extension('mockextension') is True


    def test_update_single(self):
        installed = []
        def _mock_install(self, name, *args, **kwargs):
            installed.append(name[0] + name[1:].split('@')[0])
            return dict(name=name, is_dir=False, path='foo/bar/' + name)

        def _mock_latest(self, name):
            return '10000.0.0'

        p1 = patch.object(
            commands._AppHandler,
            '_install_extension',
            _mock_install)
        p2 = patch.object(
            commands._AppHandler,
            '_latest_compatible_package_version',
            _mock_latest)

        assert install_extension(self.mock_extension) is True
        assert install_extension(self.mock_mimeextension) is True

        with p1, p2:
            assert update_extension(self.pkg_names['extension']) is True
        assert installed == [self.pkg_names['extension']]


    def test_update_missing_extension(self):
        assert False == update_extension('foo')


    def test_update_multiple(self):
        installed = []
        def _mock_install(self, name, *args, **kwargs):
            installed.append(name[0] + name[1:].split('@')[0])
            return dict(name=name, is_dir=False, path='foo/bar/' + name)

        def _mock_latest(self, name):
            return '10000.0.0'

        p1 = patch.object(
            commands._AppHandler,
            '_install_extension',
            _mock_install)
        p2 = patch.object(
            commands._AppHandler,
            '_latest_compatible_package_version',
            _mock_latest)

        install_extension(self.mock_extension)
        install_extension(self.mock_mimeextension)

        with p1, p2:
            assert update_extension(self.pkg_names['extension']) is True
            assert update_extension(self.pkg_names['mimeextension']) is True
        assert installed == [self.pkg_names['extension'], self.pkg_names['mimeextension']]

    def test_update_all(self):
        updated = []
        def _mock_update(self, name, *args, **kwargs):
            updated.append(name[0] + name[1:].split('@')[0])
            return True

        original_app_info = commands._AppHandler._get_app_info
        def _mock_app_info(self):
            info = original_app_info(self)
            info['local_extensions'] = []
            return info


        assert install_extension(self.mock_extension) is True
        assert install_extension(self.mock_mimeextension) is True

        p1 = patch.object(
            commands._AppHandler,
            '_update_extension',
            _mock_update)

        # local packages are not updated, so mock them as non-local:
        p2 = patch.object(
            commands._AppHandler,
            '_get_app_info',
            _mock_app_info
        )

        with p1, p2:
            assert update_extension(None, all_=True) is True
        assert sorted(updated) == [self.pkg_names['extension'], self.pkg_names['mimeextension']]
