#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
from os.path import join as pjoin
import functools
import pipes

from setuptools import Command
from setuptools.command.build_py import build_py
from setuptools.command.sdist import sdist
from setuptools.command.develop import develop
from setuptools.command.bdist_egg import bdist_egg
from distutils import log
from subprocess import check_call
from distutils.spawn import find_executable as which
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


__version__ = '0.1.0'

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

if "--skip-npm" in sys.argv:
    print("Skipping install of webtools as requested.")
    skip_npm = True
    sys.argv.remove("--skip-npm")
else:
    skip_npm = False

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


def run(cmd, *args, **kwargs):
    """Echo a command before running it"""
    log.info('> ' + list2cmdline(cmd))
    kwargs.setdefault('cwd', here)
    kwargs.setdefault('shell', sys.platform == 'win32')
    return check_call(cmd, *args, **kwargs)


def is_stale(target, source):
    """Test whether the target file/directory is stale based on the source
       file/directory.
    """
    if not os.path.exists(target):
        return True
    return mtime(target) < mtime(source)


class BaseCommand(Command):
    """Empty command because Command needs subclasses to override too much"""
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def get_inputs(self):
        return []

    def get_outputs(self):
        return []


def combine_commands(*commands):
    """Return a Command that combines several commands."""

    class CombinedCommand(Command):

        def initialize_options(self):
            self.commands = []
            for C in commands:
                self.commands.append(C(self.distribution))
            for c in self.commands:
                c.initialize_options()

        def finalize_options(self):
            for c in self.commands:
                c.finalize_options()

        def run(self):
            for c in self.commands:
                c.run()
    return CombinedCommand


def mtime(path):
    """shorthand for mtime"""
    return os.stat(path).st_mtime


def install_npm(path, build_dir, source_dir, build_cmd='build'):
    """Return a Command for running npm install and npm build at a given path."""

    class NPM(BaseCommand):
        description = 'install package.json dependencies using npm'

        def run(self):
            if skip_npm:
                log.info('Skipping npm-installation')
                return
            node_package = path
            node_modules = pjoin(node_package, 'node_modules')

            if not which("npm"):
                log.error("`npm` unavailable.  If you're running this command "
                          "using sudo, make sure `npm` is availble to sudo")
            if is_stale(node_modules, pjoin(node_package, 'package.json')):
                log.info('Installing build dependencies with npm.  This may '
                         'take a while...')
                run('npm install', cwd=node_package)
            if is_stale(build_dir, source_dir):
                run(['npm', 'run', build_cmd], cwd=node_package)
    return NPM


# ---------------------------------------------------------------------------
# Private Functions
# ---------------------------------------------------------------------------


def wrap_command(cmds, data_dirs, cls, strict=True):
    """Wrap a setup command

    Parameters
    ----------
    cmds: list(str)
        The names of the other commands to run prior to the command.
    strict: boolean, optional
        Wether to raise errors when a pre-command fails.
    """
    class WrappedCommand(cls):

        def run(self):
            if not getattr(self, 'uninstall', None):
                try:
                    [self.run_command(cmd) for cmd in cmds]
                except Exception:
                    if strict:
                        raise
                    else:
                        pass

            result = cls.run(self)
            data_files = []
            for dname in data_dirs:
                data_files.extend(get_data_files(dname))
            # update data-files in case this created new files
            self.distribution.data_files = data_files
            return result
    return WrappedCommand


class bdist_egg_disabled(bdist_egg):
    """Disabled version of bdist_egg
    Prevents setup.py install performing setuptools' default easy_install,
    which it should never ever do.
    """

    def run(self):
        sys.exit("Aborting implicit building of eggs. Use `pip install .` " +
                 " to install from source.")
