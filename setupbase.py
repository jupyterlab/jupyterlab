#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Copied from https://github.com/jupyter/jupyter-packaging/blob/d522577d354d031c17f228513b695ce22efc8a1c/jupyter_distutils.py

import os
from os.path import join as pjoin
import functools
import pipes
import shutil

from distutils.cmd import Command
from setuptools.command.build_py import build_py
from setuptools.command.sdist import sdist
from setuptools.command.develop import develop
from setuptools.command.bdist_egg import bdist_egg
from distutils import log
from subprocess import check_call
import sys

try:
    from wheel.bdist_wheel import bdist_wheel
except ImportError:
    bdist_wheel = None

if sys.platform == 'win32':
    from subprocess import list2cmdline
else:
    def list2cmdline(cmd_list):
        return ' '.join(map(pipes.quote, cmd_list))

# ---------------------------------------------------------------------------
# Top Level Variables
# ---------------------------------------------------------------------------


here = os.path.abspath(os.path.dirname(sys.argv[0]))
is_repo = os.path.exists(pjoin(here, '.git'))
node_modules = pjoin(here, 'node_modules')
npm_path = ':'.join([
    pjoin(here, 'node_modules', '.bin'),
    os.environ.get('PATH', os.defpath),
])

# ---------------------------------------------------------------------------
# Public Functions
# ---------------------------------------------------------------------------


def get_data_files(top):
    """Get data files"""

    data_files = []
    ntrim = len(here + os.path.sep)

    for (d, dirs, filenames) in os.walk(top):
        data_files.append((
            d[ntrim:],
            [pjoin(d, f) for f in filenames]
        ))
    return data_files


def find_packages(top):
    """
    Find all of the packages.
    """
    packages = []
    for d, _, _ in os.walk(top):
        if os.path.exists(pjoin(d, '__init__.py')):
            packages.append(d.replace(os.path.sep, '.'))


def create_cmdclass(wrappers=None, data_dirs=None):
    """Create a command class with the given optional wrappers.

    Parameters
    ----------
    wrappers: list(str), optional
        The cmdclass names to run before running other commands
    data_dirs: list(str), optional.
        The directories containing static data.
    """
    egg = bdist_egg if 'bdist_egg' in sys.argv else bdist_egg_disabled
    wrappers = wrappers or []
    data_dirs = data_dirs or []
    wrapper = functools.partial(wrap_command, wrappers, data_dirs)
    cmdclass = dict(
        build_py=wrapper(build_py, strict=is_repo),
        sdist=wrapper(sdist, strict=True),
        bdist_egg=egg,
        develop=wrapper(develop, strict=True)
    )
    if bdist_wheel:
        cmdclass['bdist_wheel'] = wrapper(bdist_wheel, strict=True)
    return cmdclass


def mtime(path):
    """shorthand for mtime"""
    return os.stat(path).st_mtime


def run(cmd, *args, **kwargs):
    """Echo a command before running it"""
    log.info('> ' + list2cmdline(cmd))
    kwargs.setdefault('cwd', here)
    kwargs.setdefault('shell', sys.platform == 'win32')
    return check_call(cmd, *args, **kwargs)


def should_run_npm():
    """Test whether npm should be run"""
    if not shutil.which('npm'):
        log.error("npm unavailable")
        return False
    return is_stale(node_modules, pjoin(here, 'package.json'))


def run_npm():
    """Run npm install"""
    log.info("Installing build dependencies with npm")
    run(['npm', 'install', '--progress=false'])
    os.utime(node_modules)
    env = os.environ.copy()
    env['PATH'] = npm_path


def is_stale(target, source):
    """Test if a target location is stale based on a source location
    modified time.
    """
    if not os.path.exists(target):
        return True
    return mtime(target) < mtime(source)


class BaseCommand(Command):
    """Dumb empty command because Command needs subclasses to override too much"""
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def get_inputs(self):
        return []

    def get_outputs(self):
        return []


# ---------------------------------------------------------------------------
# Private Functions
# ---------------------------------------------------------------------------


def wrap_command(cmds, data_dirs, cls, strict=True):
    """Wrap a setup command

    Parameters
    ----------
    cmds: list(str)
        The names of the other commands to run prior to the command.
    data_dirs: list(str), optional.
        The directories containing static data.
    strict: boolean, optional
        Wether to raise errors when a pre-command fails.
    """
    class Command(cls):

        def run(self):
            if not getattr(self, 'uninstall', None):
                try:
                    [self.run_command(cmd) for cmd in cmds]
                except Exception:
                    if strict:
                        raise
                    else:
                        pass

            result = super().run()
            data_files = []
            for dname in data_dirs:
                data_files.extend(get_data_files(dname))
            # update data-files in case this created new files
            self.distribution.data_files = data_files
            return result
    return Command


class bdist_egg_disabled(bdist_egg):
    """Disabled version of bdist_egg
    Prevents setup.py install performing setuptools' default easy_install,
    which it should never ever do.
    """

    def run(self):
        sys.exit("Aborting implicit building of eggs. Use `pip install .` " +
                 " to install from source.")
