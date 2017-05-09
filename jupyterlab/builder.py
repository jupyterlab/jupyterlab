# coding: utf-8
"""JupyterLab npm wrapper which preferentially uses yarnpkg"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from pathlib import Path
import shutil
from subprocess import check_output, CalledProcessError, Popen, PIPE
import json
from tempfile import mkdtemp


def get_build_tool(use=None, verbose=True):
    """Detect the right asset manager to use

    due to a collision between Apache YARN, `yarnpkg` is the preferred name
    """

    for Manager in [Yarn]:
        commands = Manager.possible_cmds
        # always try the user-specified command first
        if use:
            commands = [use] + commands

        for cmd in commands:
            try:
                check_output([cmd, '--version'])
                return Manager(cmd, verbose=verbose)
            except FileNotFoundError:
                pass

    raise ImportError(
        'No compatible frontend build tool was found, tried: {}'.format(
            ", ".join(commands)
        ))


class FrontendAssetManager(object):
    """base wrapper class for <user command>, yarnpkg, yarn
       (in order of preference)
    """
    verbose = False

    def __init__(self, cmd=None, verbose=None):
        if cmd is not None:
            self._cmd = cmd

        if self.verbose is not None:
            self.verbose = verbose

    def _run(self, cmd_args, no_capture=False, **popen_kwargs):
        """execute a command, returning the result of stdout
           `verbose` affects how much output we give back
        """
        self.print_mirror_stats()
        final_cmd = (self._cmd,) + cmd_args

        if self.verbose:
            print(">>> ./cwd", popen_kwargs.get("cwd"))
            print(">>>", " ".join(final_cmd))

        if no_capture:
            p = Popen(final_cmd, **popen_kwargs)
        else:
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
            print(">>> Command returned (code: {}):".format(p.returncode))

            if stdout:
                print("\n>>> Command Output:")
                print(stdout.decode('utf-8'))

            if stderr:
                print("\n>>> Command Error:")
                print(stderr.decode('utf-8'))

            if error:
                print("\n>>> Command Exception:")
                print(error)

            if has_err:
                raise CalledProcessError(p.returncode, final_cmd)

        self.print_mirror_stats()

        return stdout

    def run(self, user_command=tuple(), *extra_args, **popen_kwargs):
        """run a command in the `scripts` section of package.json
        """
        result = self._run(user_command + extra_args, **popen_kwargs)
        return result

    def print_mirror_stats(self):
        path = Path("/Users/nbollweg/Documents/projects/jupyterlab-dev/envs/dev/")
        print("MIRROR", len(list(Path(path / "share/jupyter/lab/.mirror").glob("*"))))


class Yarn(FrontendAssetManager):
    """yarn is newer than npm, and not as widely distributed, but is far faster
       and more reproducible, and better at offline operations.
       when you use it, you are giving your data to the facebook, and maybe
       the npm company.
    """
    cmd = 'yarnpkg'
    possible_cmds = ['yarnpkg', 'yarn']

    def install(self, packages=tuple(), save=True, save_dev=None, *extra_args, **popen_kwargs):
        """Yarn only supports saving"""
        args = ('add', '--force', '--prefer-offline')

        if not packages:
            # attempt some install types:
            attempts = [
                ('--offline',),
                ('--prefer-offline',),
                tuple(),
                ('--verbose',),
            ]

            for attempt in attempts:
                try:
                    print("ATTEMPTING", attempt)
                    return self._run(attempt + extra_args, **popen_kwargs)
                except:
                    pass

            raise Exception('No install type worked!')

        elif save_dev:
            args = args + ('--dev',)

        cache_dir = Path(
            self._run(('cache', 'dir'), **popen_kwargs)
            .decode('utf-8')
            .strip())

        # this seems to be a bit sticky
        shutil.rmtree(str(cache_dir / '.tmp'))

        for pkg in packages:
            if '@file:' in pkg:
                pkg_name, local_path = pkg.split('@file:')
                try:
                    # remove the package from node_modules
                    self._run(('remove', pkg_name),
                              **popen_kwargs)
                except:
                    pass
                # clear associated packages
                cache_files = list(cache_dir.glob('npm-{}-*/'.format(pkg_name)))
                for cache_file in cache_files:
                    print("clearing cache file", cache_file)
                    shutil.rmtree(str(cache_file))

        return self._run(args + tuple(packages) + extra_args,
                         **popen_kwargs)

    def pack(self, path, cwd=None, *extra_args, **popen_kwargs):
        self._run(('pack',) + extra_args, cwd=path, **popen_kwargs)
        tars = list(Path(path).glob("*.tgz"))
        tmp_file = tars[0]
        dst_file = Path(cwd) / tmp_file.name
        if dst_file.exists():
            if self.verbose:
                print("removing", dst_file)
            dst_file.unlink()

        if self.verbose:
            print("moving", tmp_file, "to", dst_file)
        shutil.move(str(tmp_file), cwd)

        return tmp_file.name.encode('utf-8')

    def remove(self, packages, **popen_kwargs):
        self._run(("remove", ) + tuple(packages), **popen_kwargs)

    def link(self, packages=tuple(), **popen_kwargs):
        self._run(("link", ) + tuple(packages), **popen_kwargs)

    def unlink(self, packages=tuple(), **popen_kwargs):
        self._run(("unlink", ) + tuple(packages), **popen_kwargs)
