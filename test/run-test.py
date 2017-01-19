# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function, absolute_import

import atexit
import json
import os
from subprocess import Popen
import sys
import shutil
import tempfile

from tornado import gen
from tornado.ioloop import IOLoop
from notebook.notebookapp import NotebookApp
from traitlets import Bool, Unicode


HERE = os.path.dirname(__file__)


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

    return ['karma', 'start'] + sys.argv[1:]


def create_notebook_dir():
    """Create a temporary directory with some file structure."""
    root_dir = tempfile.mkdtemp(prefix='mock_contents')
    os.mkdir(os.path.join(root_dir, 'src'))
    with open(os.path.join(root_dir, 'src', 'temp.txt'), 'w') as fid:
        fid.write('hello')
    atexit.register(lambda: shutil.rmtree(root_dir, True))
    return root_dir


@gen.coroutine
def run(cmd):
    """Run the cmd and exit with the return code"""
    yield gen.moment  # sync up with the ioloop

    shell = os.name == 'nt'
    proc = Popen(cmd, shell=shell)
    print('\n\nRunning command: "%s"\n\n' % ' '.join(cmd))

    # Poll the process once per second until finished.
    while 1:
        yield gen.sleep(1)
        if proc.poll() is not None:
            break

    exit(proc.returncode)


@gen.coroutine
def exit(code):
    """Safely stop the app and then exit with the given code."""
    yield gen.moment   # sync up with the ioloop
    IOLoop.current().stop()
    sys.exit(code)


class TestApp(NotebookApp):
    """A notebook app that supports a unit test."""

    open_browser = Bool(False)
    notebook_dir = Unicode(create_notebook_dir())
    allow_origin = Unicode('*')


def main():
    """Run the unit test."""
    app = TestApp()

    if app.version == '4.3.0':
        msg = ('Cannot run unit tests against Notebook 4.3.0.  '
               'Please upgrade to Notebook 4.3.1+')
        print(msg)
        sys.exit(1)

    app.initialize([])  # reserve sys.argv for the command
    cmd = get_command(app)
    run(cmd)

    try:
        app.start()
    except KeyboardInterrupt:
        exit(1)


if __name__ == '__main__':
    main()
