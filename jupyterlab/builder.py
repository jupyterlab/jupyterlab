# coding: utf-8
"""JupyterLab npm wrapper which preferentially uses yarnpkg"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from pathlib import Path
from subprocess import check_output, CalledProcessError, Popen, PIPE


def get_build_tool(use=None, verbose=True, silent=None):
    """Detect the right asset manager to use"""

    commands = ['yarnpkg', 'yarn', 'npm']

    if use:
        commands = [use] + commands

    for cmd in commands:
        try:
            check_output([cmd, '--version'])
            if 'yarn' in Path(cmd).name:
                return YarnpkgManager(cmd, verbose=verbose, silent=silent)
            else:
                return NPMManager(cmd, verbose=verbose, silent=silent)
        except CalledProcessError:
            pass

    raise ImportError(
        'No compatible frontend build tool was found, tried: {}'.format(
            ", ".join(commands)
        ))


class FrontendAssetManager(object):
    """base wrapper class for <user command>, yarnpkg, yarn or npm
       (in order of preference)
    """
    verbose = False
    silent = False

    def __init__(self, cmd=None, verbose=None, silent=None):
        if cmd is not None:
            self._cmd = cmd

        if self.verbose is not None:
            self.verbose = verbose

        if self.silent is not None:
            self.silent = silent

    def _run(self, cmd_args, **popen_kwargs):
        """execute a command, returning the result of stdout
           `verbose` and `silent` affect how much output we give back
        """
        final_cmd = (self._cmd,) + cmd_args

        if self.verbose:
            print(">>>", " ".join(final_cmd))

        p = Popen(final_cmd, stdout=PIPE, stderr=PIPE, **popen_kwargs)
        error = None
        stdout = None
        stderr = None

        try:
            stdout, stderr = p.communicate()
        except Exception as err:
            error = err

        has_err = error or p.returncode or p.returncode is None

        if self.verbose or has_err:
            print("Command returned (code: {}):".format(p.returncode))

            if stdout:
                print("\nCommand Output:")
                print(stdout.decode('utf-8'))

            if stderr:
                print("\nCommand Error:")
                print(stderr.decode('utf-8'))

            if error:
                print("\nCommand Exception:")
                print(error)

            if has_err:
                raise CalledProcessError(p.returncode, final_cmd)

        return stdout

    def run(self, user_command, *extra_args, **popen_kwargs):
        """run a command in the `scripts` section of package.json
           not strictly required with yarn, but namespaces are generally good
        """
        return self._run(
            ('run', user_command,) + extra_args,
            **popen_kwargs)

    def pack(self, path):
        return self._run(('pack', path))


class NPMManager(FrontendAssetManager):
    """npm is very widely distributed, but pretty slow, somewhat unreliable.
       when you use it, you are giving your data to the npm company.
    """
    cmd = 'npm'

    def install(self, packages=None, save=None, save_dev=None, *extra_args, **popen_kwargs):
        args = ('install',)
        if packages is None:
            packages = tuple()
        elif save_dev:
            args = args + ('--save-dev',)
        elif save:
            args = args + ('--save',)
        return self._run(args + tuple(packages) + extra_args, **popen_kwargs)


class YarnpkgManager(FrontendAssetManager):
    """yarn is newer than npm, and not as widely distributed, but is far faster
       and more reproducible, and better at offline operations.
       when you use it, you are giving your data to the facebook, and maybe
       the npm company.
    """
    cmd = 'yarnpkg'

    def install(self, packages=None, save=True, save_dev=None, *extra_args, **popen_kwargs):
        """Yarn only supports saving"""
        args = ('add',)

        if packages is None:
            return self._run(tuple() + extra_args, **popen_kwargs)
        elif save_dev:
            args = args + ('--dev',)

        print(args, packages, extra_args)

        return self._run(args + packages + extra_args,
                         **popen_kwargs)
