# coding: utf-8
"""A Jupyter-aware wrapper for the yarn package manager"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import sys

import os
from ipython_genutils.py3compat import which as _which

try:
    import subprocess32 as subprocess
except ImportError:
    import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
YARN_PATH = os.path.join(HERE, 'staging', 'yarn.js')


def execvp(cmd, argv):
    """Execvp, except on Windows where it uses Popen.

    The first argument, by convention, should point to the filename
    associated with the file being executed.

    Python provides execvp on Windows, but its behavior is problematic
    (Python bug#9148).
    """
    cmd = which(cmd)
    if os.name == 'nt':
        import signal
        import sys
        p = subprocess.Popen([cmd] + argv[1:])
        # Don't raise KeyboardInterrupt in the parent process.
        # Set this after spawning, to avoid subprocess inheriting handler.
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        p.wait()
        sys.exit(p.returncode)
    else:
        os.execvp(cmd, argv)


def which(command, env=None):
    """Get the full path to a command.

    Parameters
    ----------
    command: str
        The command name or path.
    env: dict, optional
        The environment variables, defaults to `os.environ`.
    """
    env = env or os.environ
    path = env.get('PATH') or os.defpath
    command_with_path = _which(command, path=path)

    # Allow nodejs as an alias to node.
    if command == 'node' and not command_with_path:
        command = 'nodejs'
        command_with_path = _which('nodejs', path=path)

    if not command_with_path:
        if command in ['nodejs', 'node', 'npm']:
            msg = 'Please install nodejs 5+ and npm before continuing installation. nodejs may be installed using conda or directly from the nodejs website.'
            raise ValueError(msg)
        raise ValueError('The command was not found or was not ' +
                'executable: %s.' % command)
    return command_with_path


def main(argv=None):
    """Run node and return the result.
    """
    # Make sure node is available.
    argv = argv or sys.argv[1:]
    execvp('node', ['node', YARN_PATH] + argv)
