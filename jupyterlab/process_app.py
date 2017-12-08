# coding: utf-8
"""A lab app that runs a sub process for a demo or a test."""

from __future__ import print_function, absolute_import

import sys

from jupyterlab.process import Process
from notebook.notebookapp import NotebookApp
from tornado.ioloop import IOLoop
from traitlets import Bool


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
