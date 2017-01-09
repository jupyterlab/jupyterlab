# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function, absolute_import

import atexit
import json
import os
import subprocess
import sys
import shutil
import tempfile
from multiprocessing.pool import ThreadPool

from tornado import ioloop
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


def run_task(func, args=(), kwds={}):
    """Run a task in a thread and exit with the return code."""
    loop = ioloop.IOLoop.instance()
    worker = ThreadPool(1)

    def callback(result):
        loop.add_callback(lambda: sys.exit(result))

    def start():
        worker.apply_async(func, args, kwds, callback)

    loop.call_later(1, start)


def run_karma(base_url, token, terminalsAvailable):
    config = dict(baseUrl=base_url, token=token,
                  terminalsAvailable=terminalsAvailable)
    print('Notebook config:')
    print(json.dumps(config))
    with open(os.path.join(HERE, 'build', 'injector.js'), 'w') as fid:
        fid.write("""
        var node = document.createElement('script');
        node.id = 'jupyter-config-data';
        node.type = 'application/json';
        node.textContent = '%s';
        document.body.appendChild(node);
        """ % json.dumps(config))

    cmd = ['karma', 'start'] + ARGS
    print('Running karma as: %s' % ' '.join(cmd))
    shell = os.name == 'nt'
    return subprocess.check_call(cmd, shell=shell)


class TestApp(NotebookApp):
    """A notebook app that runs a karma test."""

    open_browser = Bool(False)
    notebook_dir = Unicode(create_notebook_dir())
    allow_origin = Unicode('*')

    def start(self):
        terminals_available = self.web_app.settings['terminals_available']
        run_task(run_karma,
            args=(self.connection_url, self.token, terminals_available))
        super(TestApp, self).start()


if __name__ == '__main__':
    # Reserve the command line arguments for karma.
    ARGS = sys.argv[1:]
    sys.argv = sys.argv[:1]

    try:
        TestApp.launch_instance()
    except KeyboardInterrupt:
        sys.exit(1)
