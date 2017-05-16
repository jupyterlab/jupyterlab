
# -*- coding: utf-8 -*-
from __future__ import print_function, absolute_import

import os
import sys
import time
import threading

from tornado import ioloop
from notebook.notebookapp import NotebookApp, flags, aliases
from traitlets import Bool, Unicode
from jupyterlab_launcher import LabConfig, add_handlers

from selenium import webdriver

from .commands import get_app_dir


here = os.path.dirname(__file__)


test_flags = dict(flags)
test_flags['core-mode'] = (
    {'TestApp': {'core_mode': True}},
    "Start the app in core mode."
)


test_aliases = dict(aliases)
test_aliases['app-dir'] = 'TestApp.app_dir'


class TestApp(NotebookApp):

    default_url = Unicode('/lab')
    open_browser = Bool(False)
    base_url = '/foo'
    flags = test_flags
    aliases = test_aliases

    core_mode = Bool(False, config=True,
        help="Whether to start the app in core mode")

    app_dir = Unicode('', config=True,
        help="The app directory to build in")

    def start(self):
        self.io_loop = ioloop.IOLoop.current()
        config = LabConfig()
        if self.core_mode:
            config.assets_dir = os.path.join(here, 'build')
        elif self.app_dir:
            config.assets_dir = os.path.join(self.app_dir, 'static')
        else:
            config.assets_dir = os.path.join(get_app_dir(), 'static')

        print('****Testing assets dir %s' % config.assets_dir)

        config.settings_dir = ''

        add_handlers(self.web_app, config)
        self.io_loop.call_later(1, self._run_selenium)
        super(TestApp, self).start()

    def _run_selenium(self):
        thread = threading.Thread(target=run_selenium,
            args=(self.display_url, self._selenium_finished))
        thread.start()

    def _selenium_finished(self, result):
        self.io_loop.add_callback(lambda: sys.exit(result))


def run_selenium(url, callback):
    """Run the selenium test and call the callback with the exit code.exit
    """

    print('Starting Firefox Driver')
    driver = webdriver.Firefox()

    print('Navigating to page:', url)
    driver.get(url)

    completed = False

    # Start a poll loop.
    t0 = time.time()
    while time.time() - t0 < 10:
        el = driver.find_element_by_id('main')
        if el:
            completed = True
            break

        # Avoid hogging the main thread.
        time.sleep(0.5)

    driver.quit()

    # Return the exit code.
    if not completed:
        callback(1)
    else:
        if os.path.exists('./geckodriver.log'):
            os.remove('./geckodriver.log')
        callback(0)


if __name__ == '__main__':
    TestApp.launch_instance()
