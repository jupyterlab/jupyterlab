
# -*- coding: utf-8 -*-
from __future__ import print_function, absolute_import

from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
import os
import platform
import sys
import tarfile
import time
import zipfile

from tornado.httpclient import HTTPClient
from tornado.ioloop import IOLoop
from notebook.notebookapp import flags, aliases
from traitlets import Bool, Unicode

from selenium import webdriver
from .labapp import LabApp


here = os.path.dirname(__file__)
GECKO_PATH = os.path.join(here, 'geckodriver')
GECKO_VERSION = '0.19.1'

# Note: These were obtained by downloading the files from
# https://github.com/mozilla/geckodriver/releases
# and computing the sha using `shasum -a 256`
GECKO_SHA = dict(
    Linux='7f55c4c89695fd1e6f8fc7372345acc1e2dbaa4a8003cee4bd282eed88145937',
    Darwin='d914e96aa88d5950c65aa2b5d6ca0976e15bbbe20d788dde3bf3906b633bd675',
    Windows='b1c180842aa127686b93b4bf8570790c26a13dcb4c703a073404e0918de42090'
)
GECKO_TAR_NAME = dict(
    Linux='linux64.tar.gz',
    Darwin='macos.tar.gz',
    Windows='win64.zip'
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
    name = GECKO_TAR_NAME[system]

    url = ('https://github.com/mozilla/geckodriver/releases/'
           'download/v%s/geckodriver-v%s-%s'
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

    if system == 'Windows':
        fid = zipfile.ZipFile(response.buffer)
    else:
        fid = tarfile.open(mode='r|gz', fileobj=response.buffer)
    fid.extractall(here)
    fid.close()

    return True


test_flags = dict(flags)
test_flags['core-mode'] = (
    {'SeleniumApp': {'core_mode': True}},
    "Start the app in core mode."
)
test_flags['dev-mode'] = (
    {'SeleniumApp': {'dev_mode': True}},
    "Start the app in dev mode."
)


test_aliases = dict(aliases)
test_aliases['app-dir'] = 'SeleniumApp.app_dir'


class SeleniumApp(LabApp):

    open_browser = Bool(False)
    base_url = '/foo/'
    ip = '127.0.0.1'
    flags = test_flags
    aliases = test_aliases

    def start(self):
        web_app = self.web_app
        web_app.settings.setdefault('page_config_data', dict())
        web_app.settings['page_config_data']['seleniumTest'] = True
        web_app.settings['page_config_data']['buildAvailable'] = False

        pool = ThreadPoolExecutor()
        future = pool.submit(run_selenium, self.display_url, self.log)
        IOLoop.current().add_future(future, self._selenium_finished)
        super(SeleniumApp, self).start()

    def _selenium_finished(self, future):
        try:
            sys.exit(future.result())
        except Exception as e:
            self.log.error(str(e))
            sys.exit(1)


def run_selenium(url, log):
    """Run the selenium test and return an exit code.
    """
    if not ensure_geckodriver(log):
        return 1

    log.info('Starting Firefox Driver')
    executable = GECKO_PATH
    if os.name == 'nt':
        executable += '.exe'
    driver = webdriver.Firefox(executable_path=executable)

    log.info('Navigating to page: %s' % url)
    driver.get(url)

    # Start a poll loop.
    log.info('Waiting for application to start...')
    t0 = time.time()
    el = None
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
        return 1

    errors = json.loads(el.get_attribute('textContent'))
    driver.quit()

    if os.path.exists('./geckodriver.log'):
            os.remove('./geckodriver.log')

    if errors:
        for error in errors:
            log.error(str(error))
        return 1

    log.info('Selenium test complete')
    return 0


if __name__ == '__main__':
    SeleniumApp.launch_instance()
