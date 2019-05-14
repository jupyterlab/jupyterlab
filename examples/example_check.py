
# -*- coding: utf-8 -*-
from concurrent.futures import ThreadPoolExecutor
import importlib.util
from os import path as osp
import os
import shutil
import sys
import subprocess

from tornado.ioloop import IOLoop
from notebook.notebookapp import flags, aliases, NotebookApp
from traitlets import Bool, Unicode
from jupyterlab.labapp import get_app_dir

here = osp.abspath(osp.dirname(__file__))


test_aliases = dict(aliases)
test_aliases['example-dir'] = 'ExampleCheckApp.example_dir'


class ExampleCheckApp(NotebookApp):

    open_browser = Bool(False)
    example_dir = Unicode('').tag(config=True)
    default_url = '/example'
    ip = '127.0.0.1'
    aliases = test_aliases

    def init_webapp(self):
        """initialize tornado webapp and httpserver.
        """
        super().init_webapp()
        test_name = osp.basename(self.example_dir)
        self.log.info('*' * 40)
        self.log.info(f'Starting test of {test_name}')
        mod_path = osp.abspath(osp.join(self.example_dir, 'main.py'))
        spec = importlib.util.spec_from_file_location("example", mod_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.web_app.add_handlers('.*$', mod.default_handlers)

    def start(self):
        pool = ThreadPoolExecutor()
        future = pool.submit(run_browser, self.display_url)
        IOLoop.current().add_future(future, self._browser_finished)
        super().start()

    def _browser_finished(self, future):
        try:
            self.log.info('*' * 40)
            sys.exit(future.result())
        except Exception as e:
            self.log.error(str(e))
            sys.exit(1)


def run_browser(url):
    """Run the browser test and return an exit code.
    """
    target = osp.join(get_app_dir(), 'example_test')
    if not osp.exists(osp.join(target, 'node_modules')):
        os.makedirs(target)
        subprocess.call(["jlpm"], cwd=target)
        subprocess.call(["jlpm", "add", "puppeteer"], cwd=target)
    shutil.copy(osp.join(here, 'chrome-example-test.js'), osp.join(target, 'chrome-example-test.js'))
    return subprocess.check_call(["node", "chrome-example-test.js", url], cwd=target)


if __name__ == '__main__':
    ExampleCheckApp.launch_instance()
