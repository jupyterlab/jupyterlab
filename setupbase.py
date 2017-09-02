# encoding: utf-8
"""
This module defines the things that are used in setup.py for building JupyterLab
This includes:
    * Functions for finding things like packages, package data, etc.
    * A function for checking dependencies.
"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import io
import json
import os
import glob
import pipes
import sys
import shutil
import os.path as osp
from os.path import join as pjoin

from distutils import log
from distutils.cmd import Command
from distutils.version import LooseVersion
from setuptools.command.bdist_egg import bdist_egg
from subprocess import check_call


if sys.platform == 'win32':
    from subprocess import list2cmdline
else:
    def list2cmdline(cmd_list):
        return ' '.join(map(pipes.quote, cmd_list))

# the name of the project
name = 'jupyterlab'


here = osp.dirname(osp.abspath(__file__))
is_repo = osp.exists(pjoin(here, '.git'))

version_ns = {}
with io.open(pjoin(here, name, '_version.py'), encoding="utf8") as f:
    exec(f.read(), {}, version_ns)


def run(cmd, *args, **kwargs):
    """Echo a command before running it"""
    log.info('> ' + list2cmdline(cmd))
    kwargs['shell'] = (sys.platform == 'win32')
    return check_call(cmd, *args, **kwargs)


#---------------------------------------------------------------------------
# Find packages
#---------------------------------------------------------------------------

def find_packages():
    """
    Find all of the packages.
    """
    packages = []
    for dir, subdirs, files in os.walk('jupyterlab'):
        package = dir.replace(osp.sep, '.')
        if '__init__.py' not in files:
            # not a package
            continue
        packages.append(package)
    return packages


#---------------------------------------------------------------------------
# Find package data
#---------------------------------------------------------------------------

def find_package_data():
    """
    Find package_data.
    """
    theme_dirs = []
    for dir, subdirs, files in os.walk(pjoin('jupyterlab', 'themes')):
        slice_len = len('jupyterlab' + os.sep)
        theme_dirs.append(pjoin(dir[slice_len:], '*'))

    return {
        'jupyterlab': ['build/*', 'schemas/*', 'index.app.js',
                       'webpack.config.js', 'package.app.json',
                       'released_packages.txt', 'node-version-check.js'] + theme_dirs
    }


def ensure_core_data(command):
    """decorator for building minified js/css prior to another command"""
    class DecoratedCommand(command):

        def run(self):
            coredeps = self.distribution.get_command_obj('coredeps')
            if not is_repo and all(osp.exists(t) for t in coredeps.targets):
                # build_py or build_ext, nothing to do
                command.run(self)
                return

            try:
                self.distribution.run_command('coredeps')
            except Exception as e:
                missing = [t for t in coredeps.targets if not osp.exists(t)]
                if missing:
                    log.warn('file check failed')
                    if missing:
                        log.error('missing files: %s' % missing)
                    raise e
                else:
                    log.warn('core deps check failed (not a problem)')
                    log.warn(str(e))
            command.run(self)
    return DecoratedCommand


def js_prerelease(command, strict=False):
    """decorator for building minified js/css prior to another command"""
    class DecoratedCommand(command):

        def run(self):
            jsdeps = self.distribution.get_command_obj('jsdeps')
            if not is_repo and all(osp.exists(t) for t in jsdeps.targets):
                # sdist, nothing to do
                command.run(self)
                return

            try:
                self.distribution.run_command('jsdeps')
            except Exception as e:
                missing = [t for t in jsdeps.targets if not osp.exists(t)]
                if strict or missing:
                    log.warn('js check failed')
                    if missing:
                        log.error('missing files: %s' % missing)
                    raise e
                else:
                    log.warn('js check failed (not a problem)')
                    log.warn(str(e))
            command.run(self)
    return DecoratedCommand


def update_package_data(distribution):
    """update build_py options to get package_data changes"""
    build_py = distribution.get_command_obj('build_py')
    build_py.finalize_options()


class CoreDeps(Command):
    description = 'ensure required core assets'

    user_options = []

    # Representative files that should exist after a successful core setup
    targets = [
        pjoin(here, 'jupyterlab', 'schemas', 'jupyter.extensions.shortcuts.json'),
        pjoin(here, 'jupyterlab', 'themes', 'jupyterlab-theme-light-extension',
            'images', 'jupyterlab.svg')
    ]

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        # Handle schemas.
        schema = pjoin(here, 'jupyterlab', 'schemas')
        if osp.exists(schema):
            shutil.rmtree(schema)
        os.makedirs(schema)

        packages = glob.glob(pjoin(here, 'packages', '**', 'package.json'))
        for pkg in packages:
            with open(pkg) as fid:
                data = json.load(fid)
            if 'jupyterlab' not in data:
                continue
            schemaDir = data['jupyterlab'].get('schemaDir', '')
            if schemaDir:
                parentDir = osp.dirname(pkg)
                files = glob.glob(pjoin(parentDir, schemaDir, '*.json'))
                for file in files:
                    shutil.copy(file, schema)

        # Handle themes
        themes = pjoin(here, 'jupyterlab', 'themes')
        if osp.exists(themes):
            shutil.rmtree(themes)
        os.makedirs(themes)

        packages = glob.glob(pjoin(here, 'packages', '**', 'package.json'))
        for pkg in packages:
            with open(pkg) as fid:
                data = json.load(fid)
            if 'jupyterlab' not in data:
                continue
            themeDir = data['jupyterlab'].get('themeDir', '')
            if themeDir:
                name = data['name'].replace('@', '').replace('/', '-')
                src = pjoin(osp.dirname(pkg), themeDir)
                shutil.copytree(src, pjoin(themes, name))

        # update package data in case this created new files
        update_package_data(self.distribution)


class CheckAssets(Command):
    description = 'check for required assets'

    user_options = []

    # Representative files that should exist after a successful build
    targets = [
        pjoin(here, 'jupyterlab', 'build', 'release_data.json'),
        pjoin(here, 'jupyterlab', 'build', 'main.bundle.js'),
    ] + CoreDeps.targets

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        for t in self.targets:
            if not osp.exists(t):
                msg = 'Missing file: %s' % t
                raise ValueError(msg)

        target = pjoin(here, 'jupyterlab', 'build', 'release_data.json')
        with open(target) as fid:
            data = json.load(fid)

        if (LooseVersion(data['version']) !=
                LooseVersion(version_ns['__version__'])):
            msg = 'Release assets version mismatch, please run npm publish'
            raise ValueError(msg)

        # update package data in case this created new files
        update_package_data(self.distribution)


class bdist_egg_disabled(bdist_egg):
    """Disabled version of bdist_egg
    Prevents setup.py install performing setuptools' default easy_install,
    which it should never ever do.
    """
    def run(self):
        sys.exit("Aborting implicit building of eggs. Use `pip install .` to install from source.")
