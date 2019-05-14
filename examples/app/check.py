
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


# Import the base class from our sibling file
mod_path = osp.abspath(osp.join(here, 'main.py'))
spec = importlib.util.spec_from_file_location("example", mod_path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class ExampleCheckApp(mod.ExampleApp):
    open_browser = Bool(False)

    def start(self):
        pool = ThreadPoolExecutor()
        future = pool.submit(run_browser, self.display_url)
        IOLoop.current().add_future(future, self._browser_finished)
        super().start()

    def _browser_finished(self, future):
        try:
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
    src = osp.abspath(osp.join(here, '..', 'chrome-example-test.js'))
    shutil.copy(src, osp.join(target, 'chrome-example-test.js'))
    return subprocess.check_call(["node", "chrome-example-test.js", url], cwd=target)


if __name__ == '__main__':
    ExampleCheckApp.launch_instance()
