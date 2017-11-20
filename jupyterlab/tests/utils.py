import errno
import os
import sys
from os.path import join as pjoin
from binascii import hexlify
from threading import Thread, Event

try:
    from unittest.mock import patch
except ImportError:
    from mock import patch  # py2

from ipython_genutils.tempdir import TemporaryDirectory
from jupyterlab.labapp import LabApp
from notebook.tests.launchnotebook import NotebookTestBase
from notebook.utils import url_path_join
import jupyter_core
from traitlets.config import Config
from tornado.ioloop import IOLoop


class LabTestBase(NotebookTestBase):

    @classmethod
    def setup_class(cls):
        cls.tmp_dir = TemporaryDirectory()

        def tmp(*parts):
            path = os.path.join(cls.tmp_dir.name, *parts)
            try:
                os.makedirs(path)
            except OSError as e:
                if e.errno != errno.EEXIST:
                    raise
            return path

        cls.home_dir = tmp('home')
        data_dir = cls.data_dir = tmp('data')
        config_dir = cls.config_dir = tmp('config')
        runtime_dir = cls.runtime_dir = tmp('runtime')
        lab_dir = cls.lab_dir = tmp('lab')
        lab_settings = cls.lab_settings = tmp('labsettings')
        cls.notebook_dir = tmp('notebooks')
        cls.env_patch = patch.dict('os.environ', {
            'HOME': cls.home_dir,
            'PYTHONPATH': os.pathsep.join(sys.path),
            'IPYTHONDIR': pjoin(cls.home_dir, '.ipython'),
            'JUPYTER_NO_CONFIG': '1',  # needed in the future
            'JUPYTER_CONFIG_DIR': config_dir,
            'JUPYTER_DATA_DIR': data_dir,
            'JUPYTER_RUNTIME_DIR': runtime_dir,
            'JUPYTERLAB_DIR': lab_dir,
            'JUPYTERLAB_SETTINGS_DIR': lab_settings
        })
        cls.env_patch.start()
        cls.path_patch = patch.multiple(
            jupyter_core.paths,
            SYSTEM_JUPYTER_PATH=[tmp('share', 'jupyter')],
            ENV_JUPYTER_PATH=[tmp('env', 'share', 'jupyter')],
            SYSTEM_CONFIG_PATH=[tmp('etc', 'jupyter')],
            ENV_CONFIG_PATH=[tmp('env', 'etc', 'jupyter')],
        )
        cls.path_patch.start()

        config = cls.config or Config()
        config.NotebookNotary.db_file = ':memory:'

        cls.token = hexlify(os.urandom(4)).decode('ascii')

        started = Event()

        def start_thread():
            app = cls.notebook = LabApp(
                port=cls.port,
                port_retries=0,
                open_browser=False,
                config_dir=cls.config_dir,
                data_dir=cls.data_dir,
                runtime_dir=cls.runtime_dir,
                notebook_dir=cls.notebook_dir,
                base_url=cls.url_prefix,
                config=config,
                allow_root=True,
                token=cls.token,
            )
            # don't register signal handler during tests
            app.init_signal = lambda: None
            # clear log handlers and propagate to root for nose to capture it
            # needs to be redone after initialize, which reconfigures logging
            app.log.propagate = True
            app.log.handlers = []
            app.initialize(argv=[])
            app.log.propagate = True
            app.log.handlers = []
            loop = IOLoop.current()
            loop.add_callback(started.set)
            try:
                app.start()
            finally:
                # set the event, so failure to start doesn't cause a hang
                started.set()
                app.session_manager.close()
        cls.notebook_thread = Thread(target=start_thread)
        cls.notebook_thread.daemon = True
        cls.notebook_thread.start()
        started.wait()
        cls.wait_until_alive()


class APITester(object):
    """Wrapper for REST API requests"""
    url = '/'

    def __init__(self, request):
        self.request = request

    def _req(self, verb, path, body=None):
        response = self.request(verb,
                url_path_join(self.url, path), data=body)

        if 400 <= response.status_code < 600:
            try:
                response.reason = response.json()['message']
            except Exception:
                pass
        response.raise_for_status()

        return response
