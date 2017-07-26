"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
from tornado import gen, web

from notebook.base.handlers import APIHandler
from .commands import build_async, clean, should_build


class Builder(object):
    building = False
    _future = None
    _should_abort = False

    def __init__(self, log):
        self.log = log

    @gen.coroutine
    def build(self, app_dir):
        if not self.building:
            self._should_abort = False
            self._future = future = gen.Future()
            self.building = True
            try:
                yield self._run_build(app_dir)
                future.set_result(True)
            except Exception as e:
                if str(e) == 'Aborted':
                    future.set_result(False)
                future.set_exception(e)
            finally:
                self.building = False
        try:
            yield self._future
            if not self._future.result():
                raise ValueError('Build aborted')
        except Exception as e:
            raise e

    @gen.coroutine
    def cancel(self):
        if not self.building:
            raise gen.Return(False)
        self._should_abort = True
        yield self._future
        raise gen.Return(not self._future.result())

    @gen.coroutine
    def _run_build(self, app_dir):
        callback = self._abort_callback
        try:
            yield build_async(app_dir, logger=self.log, abort_callback=callback)
        except Exception as e:
            if str(e) == 'Aborted':
                raise e
            self.log.warn('Build failed, running a clean and rebuild')
            clean(self.app_dir)
            yield build_async(app_dir, logger=self.log, abort_callback=callback)

    def _abort_callback(self):
        return self._should_abort


class BuildHandler(APIHandler):

    def initialize(self, app_dir, core_mode, builder):
        self.app_dir = app_dir
        self.core_mode = core_mode
        self.builder = builder

    @web.authenticated
    @gen.coroutine
    def get(self):
        if self.core_mode:
            self.finish(json.dumps(dict(status='stable', message='')))
            return
        if self.builder.building:
            self.finish(json.dumps(dict(status='building', message='')))
            return

        needed, message = should_build(self.app_dir)
        status = 'needed' if needed else 'stable'

        data = dict(status=status, message=message)
        self.finish(json.dumps(data))

    @web.authenticated
    @gen.coroutine
    def delete(self):
        self.log.warn('Canceling build')
        result = yield self.builder.cancel()
        if not result:
            raise web.HTTPError(500, 'Build not aborted')
        self.set_status(204)

    @web.authenticated
    @gen.coroutine
    def post(self):
        self.log.debug('Starting build')
        try:
            yield self.builder.build(self.app_dir)
        except Exception as e:
            raise web.HTTPError(500, str(e))

        self.log.debug('Build succeeded')
        self.set_status(200)


# The path for lab build.
build_path = r"/lab/api/build"
