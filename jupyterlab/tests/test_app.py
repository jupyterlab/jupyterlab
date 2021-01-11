# coding: utf-8
"""A lab app that runs a sub process for a demo or a test."""

from os import path as osp
from os.path import join as pjoin
from stat import S_IRUSR, S_IRGRP, S_IROTH
import argparse
import atexit
import glob
import json
import logging
import os
import pkg_resources
import shutil
import sys
import tempfile
from tempfile import TemporaryDirectory
from unittest.mock import patch

from traitlets import Bool, Dict, Unicode, default
from ipykernel.kernelspec import write_kernel_spec
import jupyter_core
from jupyter_core.application import base_aliases, base_flags

from jupyter_server.serverapp import ServerApp

from jupyterlab_server import LabConfig
from jupyterlab_server.process_app import ProcessApp
import jupyterlab_server
from jupyterlab.utils import deprecated


HERE = osp.realpath(osp.dirname(__file__))


def _create_template_dir():
    template_dir = tempfile.mkdtemp(prefix='mock_static')
    index_filepath = osp.join(template_dir, 'index.html')
    with open(index_filepath, 'w') as fid:
        fid.write("""
<!DOCTYPE HTML>
<html>
<head>
    <meta charset="utf-8">
    <title>{% block title %}Jupyter Lab Test{% endblock %}</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    {% block meta %}
    {% endblock %}
</head>
<body>
  <h1>JupyterLab Test Application</h1>
  <div id="site">
    {% block site %}
    {% endblock site %}
  </div>
  {% block after_site %}
  {% endblock after_site %}
</body>
</html>""")
    return template_dir


def _create_static_dir():
    static_dir = tempfile.mkdtemp(prefix='mock_static')
    return static_dir


def _create_schemas_dir():
    """Create a temporary directory for schemas."""
    root_dir = tempfile.mkdtemp(prefix='mock_schemas')
    extension_dir = osp.join(root_dir, '@jupyterlab', 'apputils-extension')
    os.makedirs(extension_dir)

    # Get schema content.
    schema_package = jupyterlab_server.__name__
    schema_path = 'tests/schemas/@jupyterlab/apputils-extension/themes.json'
    themes = pkg_resources.resource_string(schema_package, schema_path)

    with open(osp.join(extension_dir, 'themes.json'), 'w') as fid:
        fid.write(themes.decode('utf-8'))
    atexit.register(lambda: shutil.rmtree(root_dir, True))
    return root_dir


def _create_user_settings_dir():
    """Create a temporary directory for workspaces."""
    root_dir = tempfile.mkdtemp(prefix='mock_user_settings')
    atexit.register(lambda: shutil.rmtree(root_dir, True))
    return root_dir


def _create_workspaces_dir():
    """Create a temporary directory for workspaces."""
    root_dir = tempfile.mkdtemp(prefix='mock_workspaces')
    atexit.register(lambda: shutil.rmtree(root_dir, True))
    return root_dir


class TestEnv(object):
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
        try:
            self.test_dir.cleanup()
        except PermissionError as e:
            pass

    def __enter__(self):
        self.start()
        return self.test_dir.name

    def __exit__(self, *exc_info):
        self.stop()


class ProcessTestApp(ProcessApp):
    """A process app for running tests, includes a mock contents directory.
    """
    allow_origin = '*'

    def initialize_templates(self):
        self.static_paths = [_create_static_dir()]
        self.template_paths = [_create_template_dir()]

    def initialize_settings(self):

        self.env_patch = TestEnv()
        self.env_patch.start()
        ProcessApp.__init__(self)

        self.settings['allow_origin'] = ProcessTestApp.allow_origin

        self.static_dir = self.static_paths[0]
        self.template_dir = self.template_paths[0]
        self.schemas_dir = _create_schemas_dir()
        self.user_settings_dir = _create_user_settings_dir()
        self.workspaces_dir = _create_workspaces_dir()

        self._install_default_kernels()
        self.settings['kernel_manager'].default_kernel_name = 'echo'

        super().initialize_settings()

    def _install_kernel(self, kernel_name, kernel_spec):
        """Install a kernel spec to the data directory.

        Parameters
        ----------
        kernel_name: str
            Name of the kernel.
        kernel_spec: dict
            The kernel spec for the kernel
        """
        paths = jupyter_core.paths
        kernel_dir = pjoin(paths.jupyter_data_dir(), 'kernels', kernel_name)
        os.makedirs(kernel_dir)
        with open(pjoin(kernel_dir, 'kernel.json'), 'w') as f:
            f.write(json.dumps(kernel_spec))

    def _install_default_kernels(self):
        # Install echo and ipython kernels - should be done after env patch
        self._install_kernel(
            kernel_name="echo",
            kernel_spec={
                'argv': [
                    sys.executable,
                    '-m', 'jupyterlab.tests.echo_kernel',
                    '-f', '{connection_file}'
                ],
                'display_name': "Echo Kernel",
                'language': 'echo'
            }
        )

        paths = jupyter_core.paths
        ipykernel_dir = pjoin(paths.jupyter_data_dir(), 'kernels', 'ipython')
        write_kernel_spec(ipykernel_dir)

    def _process_finished(self, future):
        self.serverapp.http_server.stop()
        self.serverapp.io_loop.stop()
        self.env_patch.stop()
        try:
            os._exit(future.result())
        except Exception as e:
            self.log.error(str(e))
            os._exit(1)


jest_aliases = dict(base_aliases)
jest_aliases.update({
    'testPathPattern': 'JestApp.testPathPattern'
})
jest_aliases.update({
    'testNamePattern': 'JestApp.testNamePattern'
})


jest_flags = dict(base_flags)
jest_flags['coverage'] = (
    {'JestApp': {'coverage': True}},
    'Run coverage'
)
jest_flags['watchAll'] = (
    {'JestApp': {'watchAll': True}},
    'Watch all test files'
)


class JestApp(ProcessTestApp):
    """DEPRECATED: A notebook app that runs a jest test."""

    default_url = Unicode('/lab')
    extension_url = '/lab'
    name = __name__
    app_name = 'JupyterLab Jest Application'
    app_url = '/lab'

    coverage = Bool(False, help='Whether to run coverage').tag(config=True)

    testPathPattern = Unicode('').tag(config=True)

    testNamePattern = Unicode('').tag(config=True)

    watchAll = Bool(False).tag(config=True)

    aliases = jest_aliases

    flags = jest_flags

    jest_dir = Unicode('')

    test_config = Dict(dict(foo='bar'))

    @deprecated(removed_version=4)
    def get_command(self):
        """Get the command to run"""
        terminalsAvailable = self.settings['terminals_available']
        debug = self.log.level == logging.DEBUG

        # find jest
        target = osp.join('node_modules', 'jest', 'bin', 'jest.js')
        jest = ''
        cwd = osp.realpath(self.jest_dir)
        while osp.dirname(cwd) != cwd:
            if osp.exists(osp.join(cwd, target)):
                jest = osp.join(cwd, target)
                break
            cwd = osp.dirname(cwd)
        if not jest:
            raise RuntimeError('jest not found!')

        cmd = ['node']
        if self.coverage:
            cmd += [jest, '--coverage']
        elif debug:
            cmd += ['--inspect-brk', jest, '--no-cache']
            if self.watchAll:
                cmd += ['--watchAll']
            else:
                cmd += ['--watch']
        else:
            cmd += [jest]

        if self.testPathPattern:
            cmd += ['--testPathPattern', self.testPathPattern]

        if self.testNamePattern:
            cmd += ['--testNamePattern', self.testNamePattern]

        cmd += ['--runInBand']

        if self.log_level > logging.INFO:
            cmd += ['--silent']

        config = dict(baseUrl=self.serverapp.connection_url,
                      terminalsAvailable=str(terminalsAvailable),
                      token=self.settings['token'])
        config.update(**self.test_config)

        td = tempfile.mkdtemp()
        atexit.register(lambda: shutil.rmtree(td, True))

        config_path = os.path.join(td, 'config.json')
        with open(config_path, 'w') as fid:
            json.dump(config, fid)

        env = os.environ.copy()
        env['JUPYTER_CONFIG_DATA'] = config_path
        return cmd, dict(cwd=self.jest_dir, env=env)


class KarmaTestApp(ProcessTestApp):
    """DEPRECATED: A notebook app that runs the jupyterlab karma tests.
    """

    default_url = Unicode('/lab')
    extension_url = '/lab'
    name = __name__
    app_name = 'JupyterLab Karma Application'
    app_url = '/lab'

    karma_pattern = Unicode('src/*.spec.ts*')
    karma_base_dir = Unicode('')
    karma_coverage_dir = Unicode('')

    @deprecated(removed_version=4)
    def get_command(self):
        """Get the command to run."""
        terminalsAvailable = self.settings['terminals_available']
        token = self.settings['token']
        config = dict(baseUrl=self.serverapp.connection_url, token=token,
                      terminalsAvailable=str(terminalsAvailable),
                      foo='bar')

        cwd = self.karma_base_dir

        karma_inject_file = pjoin(cwd, 'build', 'injector.js')
        if not os.path.exists(pjoin(cwd, 'build')):
            os.makedirs(pjoin(cwd, 'build'))

        with open(karma_inject_file, 'w') as fid:
            fid.write("""
            require('es6-promise/dist/es6-promise.js');
            require('@lumino/widgets/style/index.css');

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
        pattern = args.pattern or self.karma_pattern
        files = glob.glob(pjoin(cwd, pattern))
        if not files:
            msg = 'No files matching "%s" found in "%s"'
            raise ValueError(msg % (pattern, cwd))

        # Find and validate the coverage folder if not specified
        if not self.karma_coverage_dir:
            with open(pjoin(cwd, 'package.json')) as fid:
                data = json.load(fid)
            name = data['name'].replace('@jupyterlab/test-', '')
            folder = osp.realpath(pjoin(HERE, '..', '..', 'packages', name))
            if not osp.exists(folder):
                raise ValueError(
                    'No source package directory found for "%s", use the pattern '
                    '"@jupyterlab/test-<package_dir_name>"' % name
                )
            self.karma_coverage_dir = folder

        env = os.environ.copy()
        env['KARMA_INJECT_FILE'] = karma_inject_file
        env.setdefault('KARMA_FILE_PATTERN', pattern)
        env.setdefault('KARMA_COVER_FOLDER', self.karma_coverage_dir)
        cwd = self.karma_base_dir
        cmd = ['karma', 'start'] + sys.argv[1:]
        return cmd, dict(env=env, cwd=cwd)


class RootedServerApp(ServerApp):

    @default('root_dir')
    def _default_root_dir(self):
        """Create a temporary directory with some file structure."""
        root_dir = tempfile.mkdtemp(prefix='mock_root')
        os.mkdir(osp.join(root_dir, 'src'))
        with open(osp.join(root_dir, 'src', 'temp.txt'), 'w') as fid:
            fid.write('hello')

        readonly_filepath = osp.join(root_dir, 'src', 'readonly-temp.txt')
        with open(readonly_filepath, 'w') as fid:
            fid.write('hello from a readonly file')

        os.chmod(readonly_filepath, S_IRUSR | S_IRGRP | S_IROTH)
        atexit.register(lambda: shutil.rmtree(root_dir, True))
        return root_dir


@deprecated(removed_version=4)
def run_jest(jest_dir):
    """Run a jest test in the given base directory.
    """
    def _jupyter_server_extension_points():
        return [
            {
                'module': __name__,
                'app': JestApp
            }
        ]
    sys.modules[__name__]._jupyter_server_extension_points = _jupyter_server_extension_points
    JestApp.jest_dir = jest_dir
    RootedServerApp.jpserver_extensions = Dict({__name__: True})
    RootedServerApp.flags = jest_flags
    RootedServerApp.launch_instance()


@deprecated(removed_version=4)
def run_karma(base_dir, coverage_dir=''):
    """Run a karma test in the given base directory.
    """
    logging.disable(logging.WARNING)
    def _jupyter_server_extension_points():
        return [
            {
                'module': __name__,
                'app': KarmaTestApp
            }
        ]
    sys.modules[__name__]._jupyter_server_extension_points = _jupyter_server_extension_points
    KarmaTestApp.karma_base_dir = base_dir
    KarmaTestApp.karma_coverage_dir = coverage_dir
    RootedServerApp.jpserver_extensions = Dict({__name__: True})
    RootedServerApp.launch_instance(argv=[])
