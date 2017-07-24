"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
from tornado import gen, web
from tornado.ioloop import IOLoop

from multiprocessing.pool import ThreadPool

from notebook.base.handlers import APIHandler
from .commands import build, clean, should_build


_workers = ThreadPool(1)


def run_background(func, future, args=(), kwds={}):
    def _callback(result):
        IOLoop.instance().add_callback(lambda: future.set_result((result)))
    _workers.apply_async(func, args, kwds, _callback)


class BuildHandler(APIHandler):

    def initialize(self, app_dir, core_mode):
        self.app_dir = app_dir
        self.core_mode = core_mode
        self.build_future = None

    @web.authenticated
    @gen.coroutine
    def get(self):
        if self.core_mode:
            self.finish(json.dumps(dict(status='stable', message='')))
            return
        if self.build_future:
            self.finish(json.dumps(dict(status='building', message='')))
            return

        needed, message = should_build(self.app_dir)
        status = 'needed' if needed else 'stable'

        data = dict(status=status, message=message)
        self.finish(json.dumps(data))

    @web.authenticated
    @gen.coroutine
    def post(self):
        self.log.debug('Starting build')
        if not self.build_future:
            future = self.build_future = gen.Future()
            run_background(self.run_build, future, args=(future,))
        try:
            yield self.build_future
        except Exception as e:
            raise web.HTTPError(500, str(e))
        self.build_future = None
        self.log.debug('Build succeeded')
        self.set_status(200)

    def run_build(self, future):
        try:
            build(self.app_dir, logger=self.log)
        except Exception as e:
            try:
                self.log.warn('Build failed, running a clean and rebuild')
                clean(self.app_dir)
                build(self.app_dir, logger=self.log)
            except Exception as e:
                future.set_exception(e)


# The path for lab build.
build_path = r"/lab/api/build"
