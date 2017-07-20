"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
from tornado import gen, web

from notebook.base.handlers import APIHandler
from .commands import build, clean


class BuildHandler(APIHandler):

    def initialize(self, app_dir):
        self.app_dir = app_dir

    @web.authenticated
    @gen.coroutine
    def post(self):
        self.log.debug('Starting build')
        try:
            yield gen.maybe_future(self.run_build())
        except Exception as e:
            self.set_status(500)
            msg = str(e)
            self.log.error(msg)
            self.finish(json.dumps(dict(message=msg)))
            return
        self.log.debug('Build succeeded')
        self.set_status(200)

    def run_build(self):
        try:
            build(self.app_dir, logger=self.log)
        except Exception:
            self.log.warn('Build failed, running a clean and rebuild')
            clean(self.app_dir)
            build(self.app_dir, logger=self.log)


# The path for lab build.
build_path = r"/lab/api/build"
