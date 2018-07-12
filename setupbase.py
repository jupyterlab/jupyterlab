#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""
This file originates from the 'jupyter-packaging' package, and
contains a set of useful utilities for including npm packages
within a Python package.
"""
from collections import defaultdict
from os.path import join as pjoin
import io
import os
import functools
import pipes
import re
import shlex
import subprocess
import sys


# BEFORE importing distutils, remove MANIFEST. distutils doesn't properly
# update it when the contents of directories change.
if os.path.exists('MANIFEST'): os.remove('MANIFEST')


from distutils.cmd import Command
from distutils.command.build_py import build_py
from distutils.command.sdist import sdist
from distutils import log

from setuptools.command.develop import develop
from setuptools.command.bdist_egg import bdist_egg

try:
    from wheel.bdist_wheel import bdist_wheel
except ImportError:
    bdist_wheel = None

if sys.platform == 'win32':
    from subprocess import list2cmdline
else:
    def list2cmdline(cmd_list):
        return ' '.join(map(pipes.quote, cmd_list))


__version__ = '0.2.0'

# ---------------------------------------------------------------------------
# Top Level Variables
# ---------------------------------------------------------------------------

HERE = os.path.abspath(os.path.dirname(__file__))
is_repo = os.path.exists(pjoin(HERE, '.git'))
node_modules = pjoin(HERE, 'node_modules')

SEPARATORS = os.sep if os.altsep is None else os.sep + os.altsep

npm_path = ':'.join([
    pjoin(HERE, 'node_modules', '.bin'),
    os.environ.get('PATH', os.defpath),
])

if "--skip-npm" in sys.argv:
    print("Skipping npm install as requested.")
    skip_npm = True
    sys.argv.remove("--skip-npm")
else:
    skip_npm = False


# ---------------------------------------------------------------------------
# Public Functions
# ---------------------------------------------------------------------------

def get_version(file, name='__version__'):
    """Get the version of the package from the given file by
    executing it and extracting the given `name`.
    """
    path = os.path.realpath(file)
    version_ns = {}
    with io.open(path, encoding="utf8") as f:
        exec(f.read(), {}, version_ns)
    return version_ns[name]


def ensure_python(specs):
    """Given a list of range specifiers for python, ensure compatibility.
    """
    if not isinstance(specs, (list, tuple)):
        specs = [specs]
    v = sys.version_info
    part = '%s.%s' % (v.major, v.minor)
    for spec in specs:
        if part == spec:
            return
        try:
            if eval(part + spec):
                return
        except SyntaxError:
            pass
    raise ValueError('Python version %s unsupported' % part)


def find_packages(top=HERE):
    """
    Find all of the packages.
    """
    packages = []
    for d, dirs, _ in os.walk(top, followlinks=True):
        if os.path.exists(pjoin(d, '__init__.py')):
            packages.append(os.path.relpath(d, top).replace(os.path.sep, '.'))
        elif d != top:
            # Do not look for packages in subfolders if current is not a package
            dirs[:] = []
    return packages


def update_package_data(distribution):
    """update build_py options to get package_data changes"""
    build_py = distribution.get_command_obj('build_py')
    build_py.finalize_options()


class bdist_egg_disabled(bdist_egg):
    """Disabled version of bdist_egg

    Prevents setup.py install performing setuptools' default easy_install,
    which it should never ever do.
    """
    def run(self):
        sys.exit("Aborting implicit building of eggs. Use `pip install .` "
                 " to install from source.")


def create_cmdclass(prerelease_cmd=None, package_data_spec=None,
        data_files_spec=None):
    """Create a command class with the given optional prerelease class.

    Parameters
    ----------
    prerelease_cmd: (name, Command) tuple, optional
        The command to run before releasing.
    package_data_spec: dict, optional
        A dictionary whose keys are the dotted package names and
        whose values are a list of glob patterns.
    data_files_spec: list, optional
        A list of (path, dname, pattern) tuples where the path is the
        `data_files` install path, dname is the source directory, and the
        pattern is a glob pattern.

    Notes
    -----
    We use specs so that we can find the files *after* the build
    command has run.

    The package data glob patterns should be relative paths from the package
    folder containing the __init__.py file, which is given as the package
    name.
    e.g. `dict(foo=['./bar/*', './baz/**'])`

    The data files directories should be absolute paths or relative paths
    from the root directory of the repository.  Data files are specified
    differently from `package_data` because we need a separate path entry
    for each nested folder in `data_files`, and this makes it easier to
    parse.
    e.g. `('share/foo/bar', 'pkgname/bizz, '*')`
    """
    wrapped = [prerelease_cmd] if prerelease_cmd else []
    if package_data_spec or data_files_spec:
        wrapped.append('handle_files')
    wrapper = functools.partial(_wrap_command, wrapped)
    handle_files = _get_file_handler(package_data_spec, data_files_spec)

    if 'bdist_egg' in sys.argv:
        egg = wrapper(bdist_egg, strict=True)
    else:
        egg = bdist_egg_disabled

    cmdclass = dict(
        build_py=wrapper(build_py, strict=is_repo),
        bdist_egg=egg,
        sdist=wrapper(sdist, strict=True),
        handle_files=handle_files,
    )

    if bdist_wheel:
        cmdclass['bdist_wheel'] = wrapper(bdist_wheel, strict=True)

    cmdclass['develop'] = wrapper(develop, strict=True)
    return cmdclass


def command_for_func(func):
    """Create a command that calls the given function."""

    class FuncCommand(BaseCommand):

        def run(self):
            func()
            update_package_data(self.distribution)

    return FuncCommand


def run(cmd, **kwargs):
    """Echo a command before running it.  Defaults to repo as cwd"""
    log.info('> ' + list2cmdline(cmd))
    kwargs.setdefault('cwd', HERE)
    kwargs.setdefault('shell', os.name == 'nt')
    if not isinstance(cmd, (list, tuple)) and os.name != 'nt':
        cmd = shlex.split(cmd)
    cmd[0] = which(cmd[0])
    return subprocess.check_call(cmd, **kwargs)


def is_stale(target, source):
    """Test whether the target file/directory is stale based on the source
       file/directory.
    """
    if not os.path.exists(target):
        return True
    target_mtime = recursive_mtime(target) or 0
    return compare_recursive_mtime(source, cutoff=target_mtime)


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
        user_options = []

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


def compare_recursive_mtime(path, cutoff, newest=True):
    """Compare the newest/oldest mtime for all files in a directory.

    Cutoff should be another mtime to be compared against. If an mtime that is
    newer/older than the cutoff is found it will return True.
    E.g. if newest=True, and a file in path is newer than the cutoff, it will
    return True.
    """
    if os.path.isfile(path):
        mt = mtime(path)
        if newest:
            if mt > cutoff:
                return True
        elif mt < cutoff:
            return True
    for dirname, _, filenames in os.walk(path, topdown=False):
        for filename in filenames:
            mt = mtime(pjoin(dirname, filename))
            if newest:  # Put outside of loop?
                if mt > cutoff:
                    return True
            elif mt < cutoff:
                return True
    return False


def recursive_mtime(path, newest=True):
    """Gets the newest/oldest mtime for all files in a directory."""
    if os.path.isfile(path):
        return mtime(path)
    current_extreme = None
    for dirname, dirnames, filenames in os.walk(path, topdown=False):
        for filename in filenames:
            mt = mtime(pjoin(dirname, filename))
            if newest:  # Put outside of loop?
                if mt >= (current_extreme or mt):
                    current_extreme = mt
            elif mt <= (current_extreme or mt):
                current_extreme = mt
    return current_extreme


def mtime(path):
    """shorthand for mtime"""
    return os.stat(path).st_mtime


def install_npm(path=None, build_dir=None, source_dir=None, build_cmd='build', force=False, npm=None):
    """Return a Command for managing an npm installation.

    Note: The command is skipped if the `--skip-npm` flag is used.

    Parameters
    ----------
    path: str, optional
        The base path of the node package.  Defaults to the repo root.
    build_dir: str, optional
        The target build directory.  If this and source_dir are given,
        the JavaScript will only be build if necessary.
    source_dir: str, optional
        The source code directory.
    build_cmd: str, optional
        The npm command to build assets to the build_dir.
    npm: str or list, optional.
        The npm executable name, or a tuple of ['node', executable].
    """

    class NPM(BaseCommand):
        description = 'install package.json dependencies using npm'

        def run(self):
            if skip_npm:
                log.info('Skipping npm-installation')
                return
            node_package = path or HERE
            node_modules = pjoin(node_package, 'node_modules')
            is_yarn = os.path.exists(pjoin(node_package, 'yarn.lock'))

            npm_cmd = npm

            if npm is None:
                if is_yarn:
                    npm_cmd = ['yarn']
                else:
                    npm_cmd = ['npm']

            if not which(npm_cmd[0]):
                log.error("`{0}` unavailable.  If you're running this command "
                          "using sudo, make sure `{0}` is available to sudo"
                          .format(npm_cmd[0]))
                return

            if force or is_stale(node_modules, pjoin(node_package, 'package.json')):
                log.info('Installing build dependencies with npm.  This may '
                         'take a while...')
                run(npm_cmd + ['install'], cwd=node_package)
            if build_dir and source_dir and not force:
                should_build = is_stale(build_dir, source_dir)
            else:
                should_build = True
            if should_build:
                run(npm_cmd + ['run', build_cmd], cwd=node_package)

    return NPM


def ensure_targets(targets):
    """Return a Command that checks that certain files exist.

    Raises a ValueError if any of the files are missing.

    Note: The check is skipped if the `--skip-npm` flag is used.
    """

    class TargetsCheck(BaseCommand):
        def run(self):
            if skip_npm:
                log.info('Skipping target checks')
                return
            missing = [t for t in targets if not os.path.exists(t)]
            if missing:
                raise ValueError(('missing files: %s' % missing))

    return TargetsCheck


# `shutils.which` function copied verbatim from the Python-3.3 source.
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
        return (os.path.exists(fn) and os.access(fn, mode) and
                not os.path.isdir(fn))

    # Short circuit. If we're given a full path which matches the mode
    # and it exists, we're done here.
    if _access_check(cmd, mode):
        return cmd

    path = (path or os.environ.get("PATH", os.defpath)).split(os.pathsep)

    if sys.platform == "win32":
        # The current directory takes precedence on Windows.
        if os.curdir not in path:
            path.insert(0, os.curdir)

        # PATHEXT is necessary to check on Windows.
        pathext = os.environ.get("PATHEXT", "").split(os.pathsep)
        # See if the given file matches any of the expected path extensions.
        # This will allow us to short circuit when given "python.exe".
        matches = [cmd for ext in pathext if cmd.lower().endswith(ext.lower())]
        # If it does match, only test that one, otherwise we have to try
        # others.
        files = [cmd] if matches else [cmd + ext.lower() for ext in pathext]
    else:
        # On other platforms you don't have things like PATHEXT to tell you
        # what file suffixes are executable, so just pass on cmd as-is.
        files = [cmd]

    seen = set()
    for dir in path:
        dir = os.path.normcase(dir)
        if dir not in seen:
            seen.add(dir)
            for thefile in files:
                name = os.path.join(dir, thefile)
                if _access_check(name, mode):
                    return name
    return None


# ---------------------------------------------------------------------------
# Private Functions
# ---------------------------------------------------------------------------


def _wrap_command(cmds, cls, strict=True):
    """Wrap a setup command

    Parameters
    ----------
    cmds: list(str)
        The names of the other commands to run prior to the command.
    strict: boolean, optional
        Whether to raise errors when a pre-command fails.
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
            # update package data
            update_package_data(self.distribution)

            result = cls.run(self)
            return result
    return WrappedCommand


def _get_file_handler(package_data_spec, data_files_spec):
    """Get a package_data and data_files handler command.
    """
    class FileHandler(BaseCommand):

        def run(self):
            package_data = self.distribution.package_data
            package_spec = package_data_spec or dict()

            for (key, patterns) in package_spec.items():
                package_data[key] = _get_package_data(key, patterns)

            self.distribution.data_files = _get_data_files(
                data_files_spec, self.distribution.data_files
            )

    return FileHandler


def _get_data_files(data_specs, existing):
    """Expand data file specs into valid data files metadata.

    Parameters
    ----------
    data_specs: list of tuples
        See [createcmdclass] for description.
    existing: list of tuples
        The existing distribution data_files metadata.

    Returns
    -------
    A valid list of data_files items.
    """
    # Extract the existing data files into a staging object.
    file_data = defaultdict(list)
    for (path, files) in existing or []:
        file_data[path] = files

    # Extract the files and assign them to the proper data
    # files path.
    for (path, dname, pattern) in data_specs or []:
        dname = dname.replace(os.sep, '/')
        offset = len(dname) + 1

        files = _get_files(pjoin(dname, pattern))
        for fname in files:
            # Normalize the path.
            root = os.path.dirname(fname)
            full_path = '/'.join([path, root[offset:]])
            if full_path.endswith('/'):
                full_path = full_path[:-1]
            file_data[full_path].append(fname)

    # Construct the data files spec.
    data_files = []
    for (path, files) in file_data.items():
        data_files.append((path, files))
    return data_files


def _get_files(file_patterns, top=HERE):
    """Expand file patterns to a list of paths.

    Parameters
    -----------
    file_patterns: list or str
        A list of glob patterns for the data file locations.
        The globs can be recursive if they include a `**`.
        They should be relative paths from the top directory or
        absolute paths.
    top: str
        the directory to consider for data files

    Note:
    Files in `node_modules` are ignored.
    """
    if not isinstance(file_patterns, (list, tuple)):
        file_patterns = [file_patterns]

    for i, p in enumerate(file_patterns):
        if os.path.isabs(p):
            file_patterns[i] = os.path.relpath(p, top)

    matchers = [_compile_pattern(p) for p in file_patterns]

    files = set()

    for root, dirnames, filenames in os.walk(top):
        # Don't recurse into node_modules
        if 'node_modules' in dirnames:
            dirnames.remove('node_modules')
        for m in matchers:
            for filename in filenames:
                fn = os.path.relpath(pjoin(root, filename), top)
                if m(fn):
                    files.add(fn.replace(os.sep, '/'))

    return list(files)


def _get_package_data(root, file_patterns=None):
    """Expand file patterns to a list of `package_data` paths.

    Parameters
    -----------
    root: str
        The relative path to the package root from `HERE`.
    file_patterns: list or str, optional
        A list of glob patterns for the data file locations.
        The globs can be recursive if they include a `**`.
        They should be relative paths from the root or
        absolute paths.  If not given, all files will be used.

    Note:
    Files in `node_modules` are ignored.
    """
    if file_patterns is None:
        file_patterns = ['*']
    return _get_files(file_patterns, pjoin(HERE, root))


def _compile_pattern(pat, ignore_case=True):
    """Translate and compile a glob pattern to a regular expression matcher."""
    if isinstance(pat, bytes):
        pat_str = pat.decode('ISO-8859-1')
        res_str = _translate_glob(pat_str)
        res = res_str.encode('ISO-8859-1')
    else:
        res = _translate_glob(pat)
    flags = re.IGNORECASE if ignore_case else 0
    return re.compile(res, flags=flags).match


def _iexplode_path(path):
    """Iterate over all the parts of a path.

    Splits path recursively with os.path.split().
    """
    (head, tail) = os.path.split(path)
    if not head or (not tail and head == path):
        if head:
            yield head
        if tail or not head:
            yield tail
        return
    for p in _iexplode_path(head):
        yield p
    yield tail


def _translate_glob(pat):
    """Translate a glob PATTERN to a regular expression."""
    translated_parts = []
    for part in _iexplode_path(pat):
        translated_parts.append(_translate_glob_part(part))
    os_sep_class = '[%s]' % re.escape(SEPARATORS)
    res = _join_translated(translated_parts, os_sep_class)
    return '{res}\\Z(?ms)'.format(res=res)


def _join_translated(translated_parts, os_sep_class):
    """Join translated glob pattern parts.

    This is different from a simple join, as care need to be taken
    to allow ** to match ZERO or more directories.
    """
    res = ''
    for part in translated_parts[:-1]:
        if part == '.*':
            # drop separator, since it is optional
            # (** matches ZERO or more dirs)
            res += part
        else:
            res += part + os_sep_class

    if translated_parts[-1] == '.*':
        # Final part is **
        res += '.+'
        # Follow stdlib/git convention of matching all sub files/directories:
        res += '({os_sep_class}?.*)?'.format(os_sep_class=os_sep_class)
    else:
        res += translated_parts[-1]
    return res


def _translate_glob_part(pat):
    """Translate a glob PATTERN PART to a regular expression."""
    # Code modified from Python 3 standard lib fnmatch:
    if pat == '**':
        return '.*'
    i, n = 0, len(pat)
    res = []
    while i < n:
        c = pat[i]
        i = i + 1
        if c == '*':
            # Match anything but path separators:
            res.append('[^%s]*' % SEPARATORS)
        elif c == '?':
            res.append('[^%s]?' % SEPARATORS)
        elif c == '[':
            j = i
            if j < n and pat[j] == '!':
                j = j + 1
            if j < n and pat[j] == ']':
                j = j + 1
            while j < n and pat[j] != ']':
                j = j + 1
            if j >= n:
                res.append('\\[')
            else:
                stuff = pat[i:j].replace('\\', '\\\\')
                i = j + 1
                if stuff[0] == '!':
                    stuff = '^' + stuff[1:]
                elif stuff[0] == '^':
                    stuff = '\\' + stuff
                res.append('[%s]' % stuff)
        else:
            res.append(re.escape(c))
    return ''.join(res)
