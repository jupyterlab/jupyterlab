
# -*- coding: utf-8 -*-
from __future__ import print_function, absolute_import

import json
import os
import sys
import time
import threading

from tornado import ioloop
from notebook.notebookapp import flags, aliases
from traitlets import Bool, Unicode

from selenium import webdriver
from .labapp import LabApp


here = os.path.dirname(__file__)


test_flags = dict(flags)
test_flags['core-mode'] = (
    {'TestApp': {'core_mode': True}},
    "Start the app in core mode."
)


test_aliases = dict(aliases)
test_aliases['app-dir'] = 'TestApp.app_dir'


class TestApp(LabApp):

    open_browser = Bool(False)
    base_url = '/foo'
    flags = test_flags
    aliases = test_aliases

    core_mode = Bool(False, config=True,
        help="Whether to start the app in core mode")

    app_dir = Unicode('', config=True,
        help="The app directory to build in")

    def start(self):
        web_app = self.web_app
        web_app.settings.setdefault('page_config_data', dict())
        web_app.settings['page_config_data']['seleniumTest'] = True

        self.io_loop = ioloop.IOLoop.current()
        self.io_loop.call_later(1, self._run_selenium)
        super(TestApp, self).start()

    def _run_selenium(self):
        # This must be done in a thread to allow the selenium driver
        # to connect to the server.
        thread = threading.Thread(target=run_selenium,
            args=(self.display_url, self.log, self._selenium_finished))
        thread.start()

    def _selenium_finished(self, result):
        self.io_loop.add_callback(lambda: sys.exit(result))


def run_selenium(url, log, callback):
    """Run the selenium test and call the callback with the exit code.exit
    """

    log.info('Starting Firefox Driver')
    driver = webdriver.Firefox()

    log.info('Navigating to page:', url)
    driver.get(url)

    # Start a poll loop.
    t0 = time.time()
    while time.time() - t0 < 20:
        try:
            el = driver.find_element_by_id('seleniumResult')
            if el:
                break
        except Exception as e:
            pass

        # Avoid hogging the main thread.
        time.sleep(0.5)

    if not el:
        driver.quit()
        log.error('Application did not restore properly')
        callback(1)
        return

    errors = json.loads(el.get_attribute('textContent'))
    driver.quit()

    if os.path.exists('./geckodriver.log'):
            os.remove('./geckodriver.log')

    if errors:
        for error in errors:
            log.error(error)
        callback(1)
        return

    callback(0)


if __name__ == '__main__':
    TestApp.launch_instance()
