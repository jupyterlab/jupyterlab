
# -*- coding: utf-8 -*-
from __future__ import print_function, absolute_import

from hashlib import sha256
from io import StringIO
import json
import os
import platform
import stat
import sys
import tarfile
import time
import threading

from tornado import ioloop
from tornado.httpclient import HTTPClient
from notebook.notebookapp import flags, aliases
from traitlets import Bool, Unicode

from selenium import webdriver
from .labapp import LabApp


here = os.path.dirname(__file__)
GECKO_PATH = os.path.join(here, 'geckodriver')
GECKO_VERSION = '0.19.1'
GECKO_SHA = dict(
    Linux='7f55c4c89695fd1e6f8fc7372345acc1e2dbaa4a8003cee4bd282eed88145937',
    Darwin='d914e96aa88d5950c65aa2b5d6ca0976e15bbbe20d788dde3bf3906b633bd675',
    Windows='b1c180842aa127686b93b4bf8570790c26a13dcb4c703a073404e0918de42090'
)
GECKO_URL_NAME = dict(
    Linux='linux64',
    Darwin='macos',
    Windows='win64'
)


def ensure_geckodriver(log):
    """Ensure a local copy of the geckodriver.
    """
    # Check for existing geckodriver file.
    if os.path.exists(GECKO_PATH):
        return True

    system = platform.system()
    if system not in GECKO_SHA:
        log.error('Unsupported platform %s' % system)
        return

    sha = GECKO_SHA[system]
    name = GECKO_URL_NAME[system]

    url = ('https://github.com/mozilla/geckodriver/releases/'
           'download/v%s/geckodriver-v%s-%s.tar.gz'
           % (GECKO_VERSION, GECKO_VERSION, name))

    log.info('Downloading geckodriver v(%s) from: %s' % (GECKO_VERSION, url))

    response = HTTPClient().fetch(url)

    log.info('Validating geckodriver...')

    if sha256(response.body).hexdigest() != sha:
        log.error('Downloaded geckodriver doesn\'t match expected:'
                  '\n\t%s !=\t%s',
                  sha256(response.body).hexdigest(),
                  sha)
        return False

    log.info('Writing %s...', GECKO_PATH)

    fid = tarfile.open(mode='r|gz', fileobj=response.buffer)
    fid.extractall(here)
    fid.close()

    return True


test_flags = dict(flags)
test_flags['core-mode'] = (
    {'TestApp': {'core_mode': True}},
    "Start the app in core mode."
)


test_aliases = dict(aliases)
test_aliases['app-dir'] = 'TestApp.app_dir'


class TestApp(LabApp):

    open_browser = Bool(False)
    base_url = '/foo/'
    ip = '127.0.0.1'
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
    if not ensure_geckodriver(log):
        return

    log.info('Starting Firefox Driver')
    driver = webdriver.Firefox(executable_path=GECKO_PATH)

    log.info('Navigating to page: %s' % url)
    driver.get(url)

    # Start a poll loop.
    log.info('Waiting for application to start...')
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
        log.error('Application did not start properly')
        callback(1)
        return

    errors = json.loads(el.get_attribute('textContent'))
    driver.quit()

    if os.path.exists('./geckodriver.log'):
            os.remove('./geckodriver.log')

    if errors:
        for error in errors:
            log.error(str(error))
        callback(1)
        return

    log.info('Selenium test complete')
    callback(0)


if __name__ == '__main__':
    TestApp.launch_instance()
