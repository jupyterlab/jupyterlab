
# -*- coding: utf-8 -*-
"""
This file is mean to be called with a path to an example directory as
its argument.  We import the application entry point for the example
and add instrument them with a puppeteer test that makes sure
there are no console errors or uncaught errors prior to a sentinal
string being printed.

e.g. python example_check.py ./app
"""
from concurrent.futures import ThreadPoolExecutor
import importlib.util
from os import path as osp
import os
import shutil
import sys
import subprocess

from tornado.ioloop import IOLoop
from traitlets import Bool, Unicode
from jupyterlab.labapp import get_app_dir

here = osp.abspath(osp.dirname(__file__))


# Load the main file and grab the example class so we can subclass
example_dir = sys.argv.pop()
mod_path = osp.abspath(osp.join(example_dir, 'main.py'))
spec = importlib.util.spec_from_file_location("example", mod_path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class ExampleCheckApp(mod.ExampleApp):

    open_browser = Bool(False)
    default_url = '/example'
    base_url = '/foo/'
    ip = '127.0.0.1'

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
    shutil.copy(osp.join(here, 'chrome-example-test.js'), osp.join(target, 'chrome-example-test.js'))
    return subprocess.check_call(["node", "chrome-example-test.js", url], cwd=target)


if __name__ == '__main__':
    ExampleCheckApp.launch_instance()
