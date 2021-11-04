# coding: utf-8
"""Test installation of JupyterLab extensions"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import glob
import json
import logging
import os
import shutil
import sys
from os.path import join as pjoin
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

import pytest
from jupyter_core import paths
from jupyterlab import commands
from jupyterlab.commands import (
    AppOptions, _compare_ranges, _test_overlap,
    build, check_extension,
    disable_extension, enable_extension,
    get_app_info, list_extensions, get_app_version
)
from jupyterlab.coreconfig import CoreConfig, _get_default_core_data

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


class AppHandlerTest(TestCase):

    def tempdir(self):
        td = TemporaryDirectory()
        self.tempdirs.append(td)
        return td.name

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
            if not os.path.exists(pjoin(dest, 'node_modules')):
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
            Path(commands.get_app_dir()).resolve(),
            (Path(self.data_dir) / 'lab').resolve()
        )

        self.app_dir = commands.get_app_dir()

        # Set pinned extension names
        self.pinned_packages = ['jupyterlab-test-extension@1.0', 'jupyterlab-test-extension@2.0']


class TestExtension(AppHandlerTest):

    def test_list_extensions(self):
        # assert install_extension(self.mock_extension) is True
        list_extensions()

    def test_app_dir(self):
        app_dir = self.tempdir()
        options = AppOptions(app_dir=app_dir)

        # assert install_extension(self.mock_extension, app_options=options) is True
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert glob.glob(path)
        extensions = get_app_info(app_options=options)['extensions']
        ext_name = self.pkg_names['extension']
        assert ext_name in extensions
        assert check_extension(ext_name, app_options=options)

        # assert uninstall_extension(self.pkg_names['extension'], app_options=options) is True
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(app_options=options)['extensions']
        assert ext_name not in extensions
        assert not check_extension(ext_name, app_options=options)

    def test_app_dir_use_sys_prefix(self):
        app_dir = self.tempdir()
        options = AppOptions(app_dir=app_dir)
        if os.path.exists(self.app_dir):
            os.removedirs(self.app_dir)

        # assert install_extension(self.mock_extension) is True
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(app_options=options)['extensions']
        ext_name = self.pkg_names['extension']
        assert ext_name in extensions
        assert check_extension(ext_name, app_options=options)

    def test_app_dir_disable_sys_prefix(self):
        app_dir = self.tempdir()
        options = AppOptions(app_dir=app_dir, use_sys_dir=False)
        if os.path.exists(self.app_dir):
            os.removedirs(self.app_dir)

        # assert install_extension(self.mock_extension) is True
        path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(path)
        extensions = get_app_info(app_options=options)['extensions']
        ext_name = self.pkg_names['extension']
        assert ext_name not in extensions
        assert not check_extension(ext_name, app_options=options)

    def test_app_dir_shadowing(self):
        app_dir = self.tempdir()
        sys_dir = self.app_dir
        app_options = AppOptions(app_dir=app_dir)
        if os.path.exists(sys_dir):
            os.removedirs(sys_dir)

        # assert install_extension(self.mock_extension) is True
        sys_path = pjoin(sys_dir, 'extensions', '*.tgz')
        assert glob.glob(sys_path)
        app_path = pjoin(app_dir, 'extensions', '*.tgz')
        assert not glob.glob(app_path)
        extensions = get_app_info(app_options=app_options)['extensions']
        ext_name = self.pkg_names['extension']
        assert ext_name in extensions
        assert check_extension(ext_name, app_options=app_options)

        # assert install_extension(self.mock_extension, app_options=app_options) is True
        assert glob.glob(app_path)
        extensions = get_app_info(app_options=app_options)['extensions']
        assert ext_name in extensions
        assert check_extension(ext_name, app_options=app_options)

        # assert uninstall_extension(self.pkg_names['extension'], app_options=app_options) is True
        assert not glob.glob(app_path)
        assert glob.glob(sys_path)
        extensions = get_app_info(app_options=app_options)['extensions']
        assert ext_name in extensions
        assert check_extension(ext_name, app_options=app_options)

        # assert uninstall_extension(self.pkg_names['extension'], app_options=app_options) is True
        assert not glob.glob(app_path)
        assert not glob.glob(sys_path)
        extensions = get_app_info(app_options=app_options)['extensions']
        assert ext_name not in extensions
        assert not check_extension(ext_name, app_options=app_options)

    @pytest.mark.slow
    def test_build(self):
        # assert install_extension(self.mock_extension) is True
        build()
        # check staging directory.
        # TODO: check something else
        entry = pjoin(self.app_dir, 'staging', 'build', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert self.pkg_names['extension'] in data

        # check static directory.
        entry = pjoin(self.app_dir, 'static', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert self.pkg_names['extension'] in data

    @pytest.mark.slow
    def test_build_splice_packages(self):
        app_options = AppOptions(splice_source=True)
        # assert install_extension(self.mock_extension) is True
        build(app_options=app_options)
        assert '-spliced' in get_app_version(app_options)
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

    @pytest.mark.slow
    def test_build_custom(self):
        # assert install_extension(self.mock_extension) is True
        build(name='foo', version='1.0', static_url='bar')

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
        assert data['jupyterlab']['staticUrl'] == 'bar'

    @pytest.mark.slow
    def test_build_custom_minimal_core_config(self):
        default_config = CoreConfig()
        core_config = CoreConfig()
        core_config.clear_packages()
        logger = logging.getLogger('jupyterlab_test_logger')
        logger.setLevel('DEBUG')
        app_dir = self.tempdir()
        options = AppOptions(
            app_dir=app_dir,
            core_config=core_config,
            logger=logger,
            use_sys_dir=False,
        )

        extensions = (
            '@jupyterlab/application-extension',
            '@jupyterlab/apputils-extension',
        )
        singletons = (
            "@jupyterlab/application",
            "@jupyterlab/apputils",
            "@jupyterlab/coreutils",
            "@jupyterlab/services",
        )
        for name in extensions:
            semver = default_config.extensions[name]
            core_config.add(name, semver, extension=True)
        for name in singletons:
            semver = default_config.singletons[name]
            core_config.add(name, semver)

        # assert install_extension(self.mock_extension, app_options=options) is True
        build(app_options=options)

        # check static directory.
        entry = pjoin(app_dir, 'static', 'index.out.js')
        with open(entry) as fid:
            data = fid.read()
        assert self.pkg_names['extension'] in data

        pkg = pjoin(app_dir, 'static', 'package.json')
        with open(pkg) as fid:
            data = json.load(fid)
        assert sorted(data['jupyterlab']['extensions'].keys()) == [
            '@jupyterlab/application-extension',
            '@jupyterlab/apputils-extension',
            '@jupyterlab/mock-extension',
        ]
        assert data['jupyterlab']['mimeExtensions'] == {}
        for pkg in data['jupyterlab']['singletonPackages']:
            if pkg.startswith('@jupyterlab/'):
                assert pkg in singletons

    def test_disable_extension(self):
        options = AppOptions(app_dir=self.tempdir())
        # assert install_extension(self.mock_extension, app_options=options) is True
        assert disable_extension(self.pkg_names['extension'], app_options=options) is True
        info = get_app_info(app_options=options)
        name = self.pkg_names['extension']
        assert name in info['disabled']
        assert not check_extension(name, app_options=options)
        assert check_extension(name, installed=True, app_options=options)
        assert disable_extension('@jupyterlab/notebook-extension', app_options=options) is True
        info = get_app_info(app_options=options)
        assert '@jupyterlab/notebook-extension' in info['disabled']
        assert not check_extension('@jupyterlab/notebook-extension', app_options=options)
        assert check_extension('@jupyterlab/notebook-extension', installed=True, app_options=options)
        assert name in info['disabled']
        assert not check_extension(name, app_options=options)
        assert check_extension(name, installed=True, app_options=options)

    def test_enable_extension(self):
        options = AppOptions(app_dir=self.tempdir())
        # assert install_extension(self.mock_extension, app_options=options) is True
        assert disable_extension(self.pkg_names['extension'], app_options=options) is True
        assert enable_extension(self.pkg_names['extension'], app_options=options) is True
        info = get_app_info(app_options=options)
        assert '@jupyterlab/notebook-extension' not in info['disabled']
        name = self.pkg_names['extension']
        assert name not in info['disabled']
        assert check_extension(name, app_options=options)
        assert disable_extension('@jupyterlab/notebook-extension', app_options=options) is True
        assert check_extension(name, app_options=options)
        assert not check_extension('@jupyterlab/notebook-extension', app_options=options)

    def test_compatibility(self):
        assert _test_overlap('^0.6.0', '^0.6.1')
        assert _test_overlap('>0.1', '0.6')
        assert _test_overlap('~0.5.0', '~0.5.2')
        assert _test_overlap('0.5.2', '^0.5.0')

        assert not _test_overlap('^0.5.0', '^0.6.0')
        assert not _test_overlap('~1.5.0', '^1.6.0')

        assert _test_overlap('*', '0.6') is None
        assert _test_overlap('<0.6', '0.1') is None

        assert _test_overlap('^1 || ^2', '^1')
        assert _test_overlap('^1 || ^2', '^2')
        assert _test_overlap('^1', '^1 || ^2')
        assert _test_overlap('^2', '^1 || ^2')
        assert _test_overlap('^1 || ^2', '^2 || ^3')
        assert not _test_overlap('^1 || ^2', '^3 || ^4')
        assert not _test_overlap('^2', '^1 || ^3')

    def test_compare_ranges(self):
        assert _compare_ranges('^1 || ^2', '^1') == 0
        assert _compare_ranges('^1 || ^2', '^2 || ^3') == 0
        assert _compare_ranges('^1 || ^2', '^3 || ^4') == 1
        assert _compare_ranges('^3 || ^4', '^1 || ^2') == -1
        assert _compare_ranges('^2 || ^3', '^1 || ^4') is None

    # def test_install_compatible(self):
    #     core_data = _get_default_core_data()
    #     current_app_dep = core_data['dependencies']['@jupyterlab/application']
    #     def _gen_dep(ver):
    #         return { "dependencies": {
    #             '@jupyterlab/application': ver
    #         }}
    #     def _mock_metadata(registry, name, logger):
    #         assert name == 'mockextension'
    #         return {
    #             "name": name,
    #             "versions": {
    #                 "0.9.0": _gen_dep(current_app_dep),
    #                 "1.0.0": _gen_dep(current_app_dep),
    #                 "1.1.0": _gen_dep(current_app_dep),
    #                 "2.0.0": _gen_dep('^2000.0.0'),
    #                 "2.0.0-b0": _gen_dep(current_app_dep),
    #                 "2.1.0-b0": _gen_dep('^2000.0.0'),
    #                 "2.1.0": _gen_dep('^2000.0.0'),
    #             }
    #         }

    #     def _mock_extract(self, source, tempdir, *args, **kwargs):
    #         data = dict(
    #             name=source, version='2.1.0',
    #             jupyterlab=dict(extension=True),
    #             jupyterlab_extracted_files=['index.js'],
    #         )
    #         data.update(_gen_dep('^2000.0.0'))
    #         info = dict(
    #             source=source, is_dir=False, data=data,
    #             name=source, version=data['version'],
    #             filename='mockextension.tgz',
    #             path=pjoin(tempdir, 'mockextension.tgz'),
    #         )
    #         return info

    #     class Success(Exception):
    #         pass

    #     def _mock_install(self, name, *args, **kwargs):
    #         assert name in ('mockextension', 'mockextension@1.1.0')
    #         if name == 'mockextension@1.1.0':
    #             raise Success()
    #         return orig_install(self, name, *args, **kwargs)

    #     p1 = patch.object(
    #         commands,
    #         '_fetch_package_metadata',
    #         _mock_metadata)
    #     p2 = patch.object(
    #         commands._AppHandler,
    #         '_extract_package',
    #         _mock_extract)
    #     p3 = patch.object(
    #         commands._AppHandler,
    #         '_install_extension',
    #         _mock_install)
    #     with p1, p2:
    #         orig_install = commands._AppHandler._install_extension
    #         with p3, pytest.raises(Success):
    #             assert install_extension('mockextension') is True


def test_load_extension(jp_serverapp, make_lab_app):
    app = make_lab_app()
    stderr = sys.stderr
    app._link_jupyter_server_extension(jp_serverapp)
    app.initialize()
    sys.stderr = stderr
