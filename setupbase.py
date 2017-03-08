#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.


import os
from os.path import join as pjoin
import functools
import pipes

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


def should_run_npm():
    """Test whether npm should be run"""
    if not which('npm'):
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

def mtime(path):
    """shorthand for mtime"""
    return os.stat(path).st_mtime


def wrap_command(cmds, data_dirs, cls, strict=True):
    """Wrap a setup command

    Parameters
    ----------
    cmds: list(str)
        The names of the other commands to run prior to the command.
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


try:
    from shutil import which
except ImportError:
    ## which() function copied from Python 3.4.3; PSF license
    def which(cmd, mode=os.F_OK | os.X_OK, path=None):
        """Given a command, mode, and a PATH string, return the path which
        conforms to the given mode on the PATH, or None if there is no such
        file.
        `mode` defaults to os.F_OK | os.X_OK. `path` defaults to the result
        of os.environ.get("PATH"), or can be overridden with a custom search
        path.
        """
        # Check that a given file can be accessed with the correct mode.
        # Additionally check that `file` is not a directory, as on Windows
        # directories pass the os.access check.
        def _access_check(fn, mode):
            return (os.path.exists(fn) and os.access(fn, mode)
                    and not os.path.isdir(fn))

        # If we're given a path with a directory part, look it up directly rather
        # than referring to PATH directories. This includes checking relative to the
        # current directory, e.g. ./script
        if os.path.dirname(cmd):
            if _access_check(cmd, mode):
                return cmd
            return None

        if path is None:
            path = os.environ.get("PATH", os.defpath)
        if not path:
            return None
        path = path.split(os.pathsep)

        if sys.platform == "win32":
            # The current directory takes precedence on Windows.
            if not os.curdir in path:
                path.insert(0, os.curdir)

            # PATHEXT is necessary to check on Windows.
            pathext = os.environ.get("PATHEXT", "").split(os.pathsep)
            # See if the given file matches any of the expected path extensions.
            # This will allow us to short circuit when given "python.exe".
            # If it does match, only test that one, otherwise we have to try
            # others.
            if any(cmd.lower().endswith(ext.lower()) for ext in pathext):
                files = [cmd]
            else:
                files = [cmd + ext for ext in pathext]
        else:
            # On other platforms you don't have things like PATHEXT to tell you
            # what file suffixes are executable, so just pass on cmd as-is.
            files = [cmd]

        seen = set()
        for dir in path:
            normdir = os.path.normcase(dir)
            if not normdir in seen:
                seen.add(normdir)
                for thefile in files:
                    name = os.path.join(dir, thefile)
                    if _access_check(name, mode):
                        return name
        return None

