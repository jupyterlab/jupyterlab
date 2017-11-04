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
import pipes
import sys
import shutil
import tempfile
import os.path as osp
from os.path import join as pjoin

from distutils import log
from distutils.cmd import Command
from distutils.version import LooseVersion
from setuptools.command.egg_info import egg_info
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

    schema_dirs = []
    for dir, subdirs, files in os.walk(pjoin('jupyterlab', 'schemas')):
        slice_len = len('jupyterlab' + os.sep)
        schema_dirs.append(pjoin(dir[slice_len:], '*'))

    return {
        'jupyterlab': ['build/*', '*.js', 'package.app.json', '.npmrc',
                       ] + theme_dirs + schema_dirs
    }


def find_data_files():
    """
    Find data_files.
    """
    if not os.path.exists(pjoin('jupyterlab', 'build')):
        return []

    files = []

    static_files = os.listdir(pjoin('jupyterlab', 'build'))
    files.append(('share/jupyter/lab/static',
        ['jupyterlab/build/%s' % f for f in static_files]))

    for dir, subdirs, fnames in os.walk(pjoin('jupyterlab', 'schemas')):
        dir = dir.replace(os.sep, '/')
        schema_files = []
        for fname in fnames:
            schema_files.append('%s/%s' % (dir, fname))
        slice_len = len('jupyterlab/')
        files.append(('share/jupyter/lab/%s' % dir[slice_len:], schema_files))

    for dir, subdirs, fnames in os.walk(pjoin('jupyterlab', 'themes')):
        dir = dir.replace(os.sep, '/')
        themes_files = []
        for fname in fnames:
            themes_files.append('%s/%s' % (dir, fname))
        slice_len = len('jupyterlab/')
        files.append(('share/jupyter/lab/%s' % dir[slice_len:], themes_files))

    return files


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


class CheckAssets(Command):
    description = 'check for required assets'

    user_options = []

    # Representative files that should exist after a successful build
    targets = [
        pjoin(here, 'jupyterlab', 'build', 'release_data.json'),
        pjoin(here, 'jupyterlab', 'build', 'main.bundle.js'),
        pjoin(here, 'jupyterlab', 'schemas', '@jupyterlab',
            'shortcuts-extension', 'plugin.json'),
        pjoin(here, 'jupyterlab', 'themes', '@jupyterlab',
            'theme-light-extension',
            'images', 'jupyterlab.svg')
    ]

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


class custom_egg_info(egg_info):
    """Prune JavaScript folders from egg_info to avoid locking up pip.
    """

    def run(self):
        folders = ['examples', 'packages', 'test', 'node_modules']
        folders = [f for f in folders if os.path.exists(pjoin(here, f))]
        tempdir = tempfile.mkdtemp()
        for folder in folders:
            shutil.move(pjoin(here, folder), tempdir)
        value = egg_info.run(self)
        for folder in folders:
            shutil.move(pjoin(tempdir, folder), here)
        shutil.rmtree(tempdir)
        return value
