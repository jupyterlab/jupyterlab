# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function, absolute_import

import atexit
import json
import os
import sys
import shutil
import tempfile

from tornado.ioloop import IOLoop
from tornado.process import Subprocess
from notebook.notebookapp import NotebookApp
from traitlets import Bool, Unicode


HERE = os.path.dirname(__file__)


def create_notebook_dir():
    """Create a temporary directory with some file structure."""
    root_dir = tempfile.mkdtemp(prefix='mock_contents')
    os.mkdir(os.path.join(root_dir, 'src'))
    with open(os.path.join(root_dir, 'src', 'temp.txt'), 'w') as fid:
        fid.write('hello')
    atexit.register(lambda: shutil.rmtree(root_dir, True))
    return root_dir


def run_command(cmd):
    """Run a task in a thread and exit with the return code."""
    shell = os.name == 'nt'
    p = Subprocess(cmd, shell=shell)
    print('\n\nRunning command: "%s"\n\n' % ' '.join(cmd))
    p.set_exit_callback(sys.exit)


def get_command(nbapp):
    """Get the command to run."""
    terminalsAvailable = nbapp.web_app.settings['terminals_available']
    # Compatibility with Notebook 4.2.
    token = getattr(nbapp, 'token', '')
    config = dict(baseUrl=nbapp.connection_url, token=token,
                  terminalsAvailable=str(terminalsAvailable))

    print('\n\nNotebook config:')
    print(json.dumps(config))

    with open(os.path.join(HERE, 'build', 'injector.js'), 'w') as fid:
        fid.write("""
        var node = document.createElement('script');
        node.id = 'jupyter-config-data';
        node.type = 'application/json';
        node.textContent = '%s';
        document.body.appendChild(node);
        """ % json.dumps(config))

    return ['karma', 'start'] + ARGS


class TestApp(NotebookApp):
    """A notebook app that runs a karma test."""

    open_browser = Bool(False)
    notebook_dir = Unicode(create_notebook_dir())
    allow_origin = Unicode('*')

    def start(self):
        # Cannot run against Notebook 4.3.0 due to auth incompatibilities.
        if self.version == '4.3.0':
            msg = ('Cannot run unit tests against Notebook 4.3.0.  '
                   'Please upgrade to Notebook 4.3.1+')
            self.log.error(msg)
            sys.exit(1)

        # Run the command after the ioloop starts.
        IOLoop.current().add_callback(run_command, get_command(self))
        super(TestApp, self).start()


if __name__ == '__main__':
    # Reserve the command line arguments for karma.
    ARGS = sys.argv[1:]
    sys.argv = sys.argv[:1]

    try:
        nbapp = TestApp.launch_instance()
    except KeyboardInterrupt:
        nbapp.stop()
