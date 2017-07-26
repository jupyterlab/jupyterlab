"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
from tornado import gen, web

from notebook.base.handlers import APIHandler
from .commands import build_async, clean, should_build


class Builder(object):
    building = False
    canceled = False
    _canceling = False
    _future = None

    def __init__(self, log, core_mode, app_dir):
        self.log = log
        self.core_mode = core_mode
        self.app_dir = app_dir

    def get_status(self):
        if self.core_mode:
            return dict(status='stable', message='')
        if self.building:
            return dict(status='building', message='')

        needed, message = should_build(self.app_dir)
        status = 'needed' if needed else 'stable'

        return dict(status=status, message=message)

    @gen.coroutine
    def build(self):
        if self._canceling:
            raise ValueError('Cancel in progress')
        if not self.building:
            self.canceled = False
            self._future = future = gen.Future()
            self.building = True
            try:
                yield self._run_build()
                future.set_result(True)
            except Exception as e:
                if str(e) == 'Aborted':
                    future.set_result(False)
                else:
                    future.set_exception(e)
            finally:
                self.building = False
        try:
            yield self._future
        except Exception as e:
            raise e

    @gen.coroutine
    def cancel(self):
        if not self.building:
            raise ValueError('No current build')
        self._canceling = True
        yield self._future
        self._canceling = False
        self.canceled = True

    @gen.coroutine
    def _run_build(self):
        app_dir = self.app_dir
        log = self.log
        callback = self._abort_callback
        try:
            yield build_async(app_dir, logger=log, abort_callback=callback)
        except Exception as e:
            if str(e) == 'Aborted':
                raise e
            self.log.warn('Build failed, running a clean and rebuild')
            clean(app_dir)
            yield build_async(app_dir, logger=log, abort_callback=callback)

    def _abort_callback(self):
        return self._canceling


class BuildHandler(APIHandler):

    def initialize(self, builder):
        self.builder = builder

    @web.authenticated
    @gen.coroutine
    def get(self):
        data = self.builder.get_status()
        self.finish(json.dumps(data))

    @web.authenticated
    @gen.coroutine
    def delete(self):
        self.log.warn('Canceling build')
        try:
            yield self.builder.cancel()
        except Exception as e:
            raise web.HTTPError(500, str(e))
        self.set_status(204)

    @web.authenticated
    @gen.coroutine
    def post(self):
        self.log.debug('Starting build')
        try:
            yield self.builder.build()
        except Exception as e:
            raise web.HTTPError(500, str(e))

        if self.builder.canceled:
            raise web.HTTPError(400, 'Build canceled')

        self.log.debug('Build succeeded')
        self.set_status(200)


# The path for lab build.
build_path = r"/lab/api/build"
