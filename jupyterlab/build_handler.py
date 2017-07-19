"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from tornado import gen, web

from notebook.base.handlers import APIHandler
from .commands import build


class BuildHandler(APIHandler):

    def initialize(self, app_dir):
        self.app_dir = app_dir

    @web.authenticated
    @gen.coroutine
    def get(self):
        self.log.warn('Starting build')
        try:
            yield gen.maybe_future(build(self.app_dir, logger=self.log))
            raise ValueError('whoops')
        except ValueError:
            self.log.warn('got value error')
        self.log.warn('Finished build')
        self.set_status(200)


# The path for lab build.
build_path = r"/lab/api/build"
