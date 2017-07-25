"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
from tornado import gen, web

from notebook.base.handlers import APIHandler
from .commands import build_async, clean, should_build


class BuildHandler(APIHandler):

    build_future = None
    should_abort = False

    def initialize(self, app_dir, core_mode):
        self.app_dir = app_dir
        self.core_mode = core_mode

    @web.authenticated
    @gen.coroutine
    def get(self):
        if self.core_mode:
            self.finish(json.dumps(dict(status='stable', message='')))
            return
        if BuildHandler.build_future:
            self.finish(json.dumps(dict(status='building', message='')))
            return

        needed, message = should_build(self.app_dir)
        status = 'needed' if needed else 'stable'

        data = dict(status=status, message=message)
        self.finish(json.dumps(data))

    @web.authenticated
    @gen.coroutine
    def delete(self):
        if BuildHandler.build_future is None:
            raise web.HTTPError(500, 'No build in progress')

        self.log.warn('stopping')
        BuildHandler.should_abort = True
        yield BuildHandler.build_future
        self.set_status(204)

    @web.authenticated
    @gen.coroutine
    def post(self):
        self.log.debug('Starting build')
        BuildHandler.should_abort = False
        if not BuildHandler.build_future:
            BuildHandler.build_future = future = gen.Future()
            try:
                yield self.run_build()
                future.set_result(None)
            except Exception as e:
                future.set_exception(e)
        try:
            yield BuildHandler.build_future
        except Exception as e:
            raise web.HTTPError(500, str(e))
        BuildHandler.build_future = None
        self.log.debug('Build succeeded')
        self.set_status(200)

    @gen.coroutine
    def run_build(self):
        try:
            yield build_async(self.app_dir, logger=self.log, abort_callback=self.abort_callback)
        except Exception as e:
            self.log.warn('Build failed, running a clean and rebuild')
            clean(self.app_dir)
            yield build_async(self.app_dir, logger=self.log, abort_callback=self.abort_callback)

    def abort_callback(self):
        return BuildHandler.should_abort


# The path for lab build.
build_path = r"/lab/api/build"
