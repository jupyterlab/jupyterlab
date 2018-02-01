# coding: utf-8
"""JupyterLab command handler"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from __future__ import print_function

import atexit
import logging
import os
import re
import signal
import sys
import threading
import time
import weakref

from tornado import gen

from .jlpmapp import which, subprocess

try:
    import pty
except ImportError:
    pty = False

if sys.platform == 'win32':
    list2cmdline = subprocess.list2cmdline
else:
    def list2cmdline(cmd_list):
        import pipes
        return ' '.join(map(pipes.quote, cmd_list))


logging.basicConfig(format='%(message)s', level=logging.INFO)


class Process(object):
    """A wrapper for a child process.
    """
    _procs = weakref.WeakSet()
    _pool = None

    def __init__(self, cmd, logger=None, cwd=None, kill_event=None,
                 env=None, quiet=False):
        """Start a subprocess that can be run asynchronously.

        Parameters
        ----------
        cmd: list
            The command to run.
        logger: :class:`~logger.Logger`, optional
            The logger instance.
        cwd: string, optional
            The cwd of the process.
        env: dict, optional
            The environment for the process.
        kill_event: :class:`~threading.Event`, optional
            An event used to kill the process operation.
        """
        if not isinstance(cmd, (list, tuple)):
            raise ValueError('Command must be given as a list')

        if kill_event and kill_event.is_set():
            raise ValueError('Process aborted')

        self.logger = logger = logger or logging.getLogger('jupyterlab')
        self._last_line = ''
        if not quiet:
            self.logger.info('> ' + list2cmdline(cmd))
        self.cmd = cmd

        self.proc = self._create_process(cwd=cwd, env=env)
        self._kill_event = kill_event or threading.Event()

        Process._procs.add(self)

    def terminate(self):
        """Terminate the process and return the exit code.
        """
        proc = self.proc

        # Kill the process.
        if proc.poll() is None:
            os.kill(proc.pid, signal.SIGTERM)

        # Wait for the process to close.
        try:
            proc.wait()
        finally:
            Process._procs.remove(self)

        return proc.returncode

    def wait(self):
        """Wait for the process to finish.

        Returns
        -------
        The process exit code.
        """
        proc = self.proc
        kill_event = self._kill_event
        while proc.poll() is None:
            if kill_event.is_set():
                self.terminate()
                raise ValueError('Process was aborted')
            time.sleep(1.)
        return self.terminate()

    @gen.coroutine
    def wait_async(self):
        """Asynchronously wait for the process to finish.
        """
        proc = self.proc
        kill_event = self._kill_event
        while proc.poll() is None:
            if kill_event.is_set():
                self.terminate()
                raise ValueError('Process was aborted')
            yield gen.sleep(1.)

        raise gen.Return(self.terminate())

    def _create_process(self, **kwargs):
        """Create the process.
        """
        cmd = self.cmd
        kwargs.setdefault('stderr', subprocess.STDOUT)

        cmd[0] = which(cmd[0], kwargs.get('env'))

        if os.name == 'nt':
            kwargs['shell'] = True

        proc = subprocess.Popen(cmd, **kwargs)
        return proc

    @classmethod
    def _cleanup(cls):
        """Clean up the started subprocesses at exit.
        """
        for proc in list(cls._procs):
            proc.terminate()


class WatchHelper(Process):
    """A process helper for a watch process.
    """

    def __init__(self, cmd, startup_regex, logger=None, cwd=None,
            kill_event=None, env=None):
        """Initialize the process helper.

        Parameters
        ----------
        cmd: list
            The command to run.
        startup_regex: string
            The regex to wait for at startup.
        logger: :class:`~logger.Logger`, optional
            The logger instance.
        cwd: string, optional
            The cwd of the process.
        env: dict, optional
            The environment for the process.
        kill_event: callable, optional
            A function to call to check if we should abort.
        """
        super(WatchHelper, self).__init__(cmd, logger=logger,
            cwd=cwd, kill_event=kill_event, env=env)

        if not pty:
            self._stdout = self.proc.stdout

        while 1:
            line = self._stdout.readline().decode('utf-8')
            if not line:
                raise RuntimeError('Process ended improperly')
            print(line.rstrip())
            if re.match(startup_regex, line):
                break

        self._read_thread = threading.Thread(target=self._read_incoming)
        self._read_thread.setDaemon(True)
        self._read_thread.start()

    def terminate(self):
        """Terminate the process.
        """
        proc = self.proc

        if proc.poll() is None:
            if os.name != 'nt':
                # Kill the process group if we started a new session.
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            else:
                os.kill(proc.pid, signal.SIGTERM)

        # Close stdout.
        try:
            self._stdout.close()
        except Exception as e:
            pass

        # Wait for the process to close.
        try:
            proc.wait()
        finally:
            Process._procs.remove(self)

        return proc.returncode

    def _read_incoming(self):
        """Run in a thread to read stdout and print"""
        fileno = self._stdout.fileno()
        while 1:
            try:
                buf = os.read(fileno, 1024)
            except OSError as e:
                self.logger.debug('Read incoming error %s', e)
                return

            if not buf:
                return

            print(buf.decode('utf-8'), end='')

    def _create_process(self, **kwargs):
        """Create the watcher helper process.
        """
        kwargs['bufsize'] = 0

        if pty:
            master, slave = pty.openpty()
            kwargs['stderr'] = kwargs['stdout'] = slave
            kwargs['start_new_session'] = True
            self._stdout = os.fdopen(master, 'rb')
        else:
            kwargs['stdout'] = subprocess.PIPE

            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                kwargs['startupinfo'] = startupinfo
                kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
                kwargs['shell'] = True

        return super(WatchHelper, self)._create_process(**kwargs)


# Register the cleanup handler.
atexit.register(Process._cleanup)
