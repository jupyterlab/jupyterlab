# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function, absolute_import

import atexit
import shutil
import subprocess
import sys
import tempfile
from multiprocessing.pool import ThreadPool


from tornado import ioloop
from notebook.notebookapp import NotebookApp
from traitlets import Bool, Unicode

root_dir = tempfile.mkdtemp(prefix='mock_contents')
atexit.register(lambda: shutil.rmtree(root_dir, True))


def run_task(func, args=(), kwds={}):
    """Run a task in a thread and exit with the return code."""
    loop = ioloop.IOLoop.instance()
    worker = ThreadPool(1)

    def callback(result):
        loop.add_callback(lambda: sys.exit(result))

    def start():
        worker.apply_async(func, args, kwds, callback)

    loop.call_later(1, start)


class TestApp(NotebookApp):

    open_browser = Bool(False)
    notebook_dir = Unicode(root_dir)

    def start(self):
        run_task(run_node, args=(self.connection_url, self.token))
        super(TestApp, self).start()


def run_node(base_url, token):
    # Run the node script with command arguments.
    node_command = ['node', 'index.js', '--baseUrl', base_url]
    if token:
        node_command.append('--token=%s' % token)

    print('*' * 60)
    print(' '.join(node_command))
    return subprocess.check_call(node_command)


if __name__ == '__main__':
    TestApp.launch_instance()
