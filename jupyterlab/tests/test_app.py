# coding: utf-8
"""A lab app that runs a sub process for a demo or a test."""

from __future__ import print_function, absolute_import

from os import path as osp
from os.path import join as pjoin
import argparse
import atexit
import glob
import json
import os
import shutil
import sys
import tempfile

try:
    from unittest.mock import patch
except ImportError:
    from mock import patch  # py2

from traitlets import Unicode
from ipython_genutils.tempdir import TemporaryDirectory
from ipykernel.kernelspec import write_kernel_spec
import jupyter_core

from jupyterlab.process_app import ProcessApp


HERE = osp.realpath(osp.dirname(__file__))


def _create_notebook_dir():
    """Create a temporary directory with some file structure."""
    root_dir = tempfile.mkdtemp(prefix='mock_contents')
    os.mkdir(osp.join(root_dir, 'src'))
    with open(osp.join(root_dir, 'src', 'temp.txt'), 'w') as fid:
        fid.write('hello')
    atexit.register(lambda: shutil.rmtree(root_dir, True))
    return root_dir


def _install_kernels():
    # Install echo and ipython kernels - should be done after env patch
    kernel_json = {
        'argv': [
            sys.executable,
            '-m', 'jupyterlab.tests.echo_kernel',
            '-f', '{connection_file}'
        ],
        'display_name': "Echo Kernel",
        'language': 'echo'
    }
    paths = jupyter_core.paths
    kernel_dir = pjoin(paths.jupyter_data_dir(), 'kernels', 'echo')
    os.makedirs(kernel_dir)
    with open(pjoin(kernel_dir, 'kernel.json'), 'w') as f:
        f.write(json.dumps(kernel_json))

    ipykernel_dir = pjoin(paths.jupyter_data_dir(), 'kernels', 'ipython')
    write_kernel_spec(ipykernel_dir)


class _test_env(object):
    """Set Jupyter path variables to a temporary directory

    Useful as a context manager or with explicit start/stop
    """

    def start(self):
        self.test_dir = td = TemporaryDirectory()
        self.env_patch = patch.dict(os.environ, {
            'JUPYTER_CONFIG_DIR': pjoin(td.name, 'jupyter'),
            'JUPYTER_DATA_DIR': pjoin(td.name, 'jupyter_data'),
            'JUPYTER_RUNTIME_DIR': pjoin(td.name, 'jupyter_runtime'),
            'IPYTHONDIR': pjoin(td.name, 'ipython'),
        })
        self.env_patch.start()
        self.path_patch = patch.multiple(
            jupyter_core.paths,
            SYSTEM_JUPYTER_PATH=[pjoin(td.name, 'share', 'jupyter')],
            ENV_JUPYTER_PATH=[pjoin(td.name, 'env', 'share', 'jupyter')],
            SYSTEM_CONFIG_PATH=[pjoin(td.name, 'etc', 'jupyter')],
            ENV_CONFIG_PATH=[pjoin(td.name, 'env', 'etc', 'jupyter')],
        )
        self.path_patch.start()

    def stop(self):
        self.env_patch.stop()
        self.path_patch.stop()
        self.test_dir.cleanup()

    def __enter__(self):
        self.start()
        return self.test_dir.name

    def __exit__(self, *exc_info):
        self.stop()


class ProcessTestApp(ProcessApp):
    """A process app for running tests, includes a mock contents directory.
    """
    notebook_dir = Unicode(_create_notebook_dir())
    allow_origin = Unicode('*')

    def __init__(self):
        self.env_patch = _test_env()
        self.env_patch.start()
        ProcessApp.__init__(self)

    def init_server_extensions(self):
        """Disable server extensions"""
        pass

    def start(self):
        _install_kernels()
        self.kernel_manager.default_kernel_name = 'echo'
        ProcessApp.start(self)

    def _process_finished(self, future):
        self.http_server.stop()
        self.io_loop.stop()
        self.env_patch.stop()
        try:
            os._exit(future.result())
        except Exception as e:
            self.log.error(str(e))
            os._exit(1)


class KarmaTestApp(ProcessTestApp):
    """A notebook app that runs the jupyterlab karma tests.
    """
    karma_pattern = Unicode('src/*.spec.ts')
    karma_base_dir = Unicode('')

    def get_command(self):
        """Get the command to run."""
        terminalsAvailable = self.web_app.settings['terminals_available']
        # Compatibility with Notebook 4.2.
        token = getattr(self, 'token', '')
        config = dict(baseUrl=self.connection_url, token=token,
                      terminalsAvailable=str(terminalsAvailable),
                      foo='bar')

        print('\n\nNotebook config:')
        print(json.dumps(config))

        cwd = self.karma_base_dir

        karma_inject_file = pjoin(cwd, 'build', 'injector.js')
        if not os.path.exists(pjoin(cwd, 'build')):
            os.makedirs(pjoin(cwd, 'build'))

        with open(karma_inject_file, 'w') as fid:
            fid.write("""
            require('es6-promise/dist/es6-promise.js');
            require('@phosphor/widgets/style/index.css');

            var node = document.createElement('script');
            node.id = 'jupyter-config-data';
            node.type = 'application/json';
            node.textContent = '%s';
            document.body.appendChild(node);
            """ % json.dumps(config))

        # validate the pattern
        parser = argparse.ArgumentParser()
        parser.add_argument('--pattern', action='store')
        args, argv = parser.parse_known_args()
        pattern = args.pattern or 'src/*.spec.ts'
        files = glob.glob(pjoin(cwd, pattern))
        if not files:
            msg = 'No files matching "%s" found in "%s"'
            raise ValueError(msg % (pattern, msg))

        # Find and validate the coverage folder
        with open(pjoin(cwd, 'package.json')) as fid:
            data = json.load(fid)
        name = data['name'].replace('@jupyterlab/test-', '')
        folder = osp.realpath(pjoin(HERE, '..', '..', 'packages', name))
        if not osp.exists(folder):
            raise ValueError(
                'No source package directory found for "%s", use the pattern '
                '"@jupyterlab/test-<package_dir_name>"' % name
            )

        env = os.environ.copy()
        env['KARMA_INJECT_FILE'] = karma_inject_file.encode('utf-8')
        env.setdefault('KARMA_FILE_PATTERN', pattern)
        env.setdefault('KARMA_COVER_FOLDER', folder.encode('utf-8'))
        cwd = self.karma_base_dir
        cmd = ['karma', 'start'] + sys.argv[1:]
        return cmd, dict(env=env, cwd=cwd)


def run_karma(base_dir):
    """Run a karma test in the given base directory.
    """
    app = KarmaTestApp.instance()
    app.karma_base_dir = base_dir
    app.initialize([])
    app.start()


if __name__ == '__main__':
    TestApp.launch_instance()
