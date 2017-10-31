# coding: utf-8
"""A lab app that runs a sub process for a demo or a test."""

from __future__ import print_function, absolute_import

import atexit
import os
import shutil
import sys
import tempfile

from jupyterlab.process import Process
from notebook.notebookapp import NotebookApp
from tornado.ioloop import IOLoop
from traitlets import Bool, Unicode


class ProcessApp(NotebookApp):
    """A notebook app that runs a separate process and exits on completion."""

    open_browser = Bool(False)

    def get_command(self):
        """Get the command and kwargs to run with `Process`.
        This is intended to be overridden.
        """
        return ['python', '--version'], dict()

    def start(self):
        """Start the application.
        """
        IOLoop.current().add_callback(self._run_command)
        NotebookApp.start(self)

    def _run_command(self):
        command, kwargs = self.get_command()
        kwargs.setdefault('logger', self.log)
        future = Process(command, **kwargs).wait_async()
        IOLoop.current().add_future(future, self._process_finished)

    def _process_finished(self, future):
        try:
            IOLoop.current().stop()
            sys.exit(future.result())
        except Exception as e:
            self.log.error(str(e))
            sys.exit(1)


def _create_notebook_dir():
    """Create a temporary directory with some file structure."""
    root_dir = tempfile.mkdtemp(prefix='mock_contents')
    os.mkdir(os.path.join(root_dir, 'src'))
    with open(os.path.join(root_dir, 'src', 'temp.txt'), 'w') as fid:
        fid.write('hello')
    atexit.register(lambda: shutil.rmtree(root_dir, True))
    return root_dir


class TestApp(ProcessApp):
    """A process app for running tests, includes a mock contents directory.
    """
    notebook_dir = Unicode(_create_notebook_dir())


if __name__ == '__main__':
    TestApp.launch_instance()
