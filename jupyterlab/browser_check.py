
# -*- coding: utf-8 -*-
from __future__ import print_function, absolute_import

from concurrent.futures import ThreadPoolExecutor
import json
import os
import shutil
import sys
import subprocess

from tornado.ioloop import IOLoop
from notebook.notebookapp import flags, aliases
from traitlets import Bool, Unicode

from .labapp import LabApp, get_app_dir


here = os.path.dirname(__file__)
test_flags = dict(flags)
test_flags['core-mode'] = (
    {'BrowserApp': {'core_mode': True}},
    "Start the app in core mode."
)
test_flags['dev-mode'] = (
    {'BrowserApp': {'dev_mode': True}},
    "Start the app in dev mode."
)


test_aliases = dict(aliases)
test_aliases['app-dir'] = 'BrowserApp.app_dir'


class BrowserApp(LabApp):

    open_browser = Bool(False)
    base_url = '/foo/'
    ip = '127.0.0.1'
    flags = test_flags
    aliases = test_aliases

    def start(self):
        web_app = self.web_app
        web_app.settings.setdefault('page_config_data', dict())
        web_app.settings['page_config_data']['browserTest'] = True
        web_app.settings['page_config_data']['buildAvailable'] = False

        pool = ThreadPoolExecutor()
        future = pool.submit(run_browser, self.display_url)
        IOLoop.current().add_future(future, self._browser_finished)
        super(BrowserApp, self).start()

    def _browser_finished(self, future):
        try:
            sys.exit(future.result())
        except Exception as e:
            self.log.error(str(e))
            sys.exit(1)


def run_browser(url):
    """Run the browser test and return an exit code.
    """
    target = os.path.join(get_app_dir(), 'browser_test')
    if not os.path.exists(os.path.join(target, 'node_modules')):
        os.makedirs(target)
        subprocess.run(["jlpm"], cwd=target)
        subprocess.run(["jlpm", "add", "puppeteer"], cwd=target)
    src = os.path.join(here, "chrome-test.js")
    return subprocess.run(["node", src, url], cwd=target).returncode


if __name__ == '__main__':
    BrowserApp.launch_instance()
