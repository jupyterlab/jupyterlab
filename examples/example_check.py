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
import os
import shutil
import subprocess
import sys
from os import path as osp

from jupyter_server.serverapp import ServerApp
from tornado.ioloop import IOLoop
from traitlets import Bool, Dict, Unicode

from jupyterlab.browser_check import run_async_process, run_test
from jupyterlab.labapp import get_app_dir

here = osp.abspath(osp.dirname(__file__))


def main():
    # Load the main file and grab the example class so we can subclass
    example_dir = sys.argv.pop()
    mod_path = osp.abspath(osp.join(example_dir, "main.py"))
    spec = importlib.util.spec_from_file_location("example", mod_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    sys.modules[__name__] = mod

    class App(mod.ExampleApp):
        """An app that launches an example and waits for it to start up, checking for
        JS console errors, JS errors, and Python logged errors.
        """

        name = __name__
        open_browser = False

        serverapp_config = {"base_url": "/foo/", "root_dir": osp.abspath(example_dir)}
        ip = "127.0.0.1"

        def initialize_settings(self):
            run_test(self.serverapp, run_browser)
            super().initialize_settings()

        def _jupyter_server_extension_points():
            return [{"module": __name__, "app": App}]

        mod._jupyter_server_extension_points = _jupyter_server_extension_points

    App.__name__ = osp.basename(example_dir).capitalize() + "Test"
    App.launch_instance()


async def run_browser(url):
    """Run the browser test and return an exit code."""
    # Run the browser test and return an exit code.
    target = osp.join(get_app_dir(), "example_test")
    if not osp.exists(osp.join(target, "node_modules")):
        if not osp.exists(target):
            os.makedirs(osp.join(target))
        await run_async_process(["npm", "init", "-y"], cwd=target)
        await run_async_process(["npm", "install", "puppeteer@^4"], cwd=target)
    shutil.copy(
        osp.join(here, "chrome-example-test.js"), osp.join(target, "chrome-example-test.js")
    )
    await run_async_process(["node", "chrome-example-test.js", url], cwd=target)


if __name__ == "__main__":
    main()
