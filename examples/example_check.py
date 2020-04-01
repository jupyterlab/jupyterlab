
# -*- coding: utf-8 -*-
"""
This file is mean to be called with a path to an example directory as
its argument.  We import the application entry point for the example
and add instrument them with a puppeteer test that makes sure
there are no console errors or uncaught errors prior to a sentinel
string being printed.

e.g. python example_check.py ./app
"""
import importlib.util
import logging
from os import path as osp
import os
import shutil
import sys
import subprocess

from tornado.ioloop import IOLoop
from traitlets import Bool, Dict, Unicode
from jupyter_server.serverapp import ServerApp
from jupyterlab.labapp import get_app_dir
from jupyterlab.browser_check import run_test
from jupyter_server.serverapp import ServerApp

here = osp.abspath(osp.dirname(__file__))


class ExampleServerApp(ServerApp):
    def start(self):
        run_test(self, run_browser)
        super().start()


def main():
    # Load the main file and grab the example class so we can subclass
    example_dir = sys.argv.pop()
    mod_path = osp.abspath(osp.join(example_dir, 'main.py'))
    spec = importlib.util.spec_from_file_location("example", mod_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    sys.modules['example'] = mod

    class App(mod.ExampleApp):
        """An app that launches an example and waits for it to start up, checking for
        JS console errors, JS errors, and Python logged errors.
        """
        extension_name = 'example'
        extension_url = '/example'
        open_browser = Bool(False)
        base_url = '/foo/'
        ip = '127.0.0.1'

        def _jupyter_server_extension_paths():
            return [
                {
                    'module': 'example',
                    'app': App
                }
            ]

        mod._jupyter_server_extension_paths = _jupyter_server_extension_paths

    App.__name__ = osp.basename(example_dir).capitalize() + 'Test'
    
    def _jupyter_server_extension_paths():
        return [
            {
                'module': 'example',
                'app': App
            }
        ]
    sys.modules['example']._jupyter_server_extension_paths = _jupyter_server_extension_paths
    ExampleServerApp.jpserver_extensions = Dict({'example': True})
    ExampleServerApp.launch_instance()


def run_browser(url):
    """Run the browser test and return an exit code.
    """
    target = osp.join(get_app_dir(), 'example_test')
    if not osp.exists(osp.join(target, 'node_modules')):
        os.makedirs(target)
        subprocess.call(["jlpm", "init", "-y"], cwd=target)
        subprocess.call(["jlpm", "add", "puppeteer"], cwd=target)
    shutil.copy(osp.join(here, 'chrome-example-test.js'), osp.join(target, 'chrome-example-test.js'))
    return subprocess.check_call(["node", "chrome-example-test.js", url], cwd=target)


if __name__ == '__main__':
    main()
