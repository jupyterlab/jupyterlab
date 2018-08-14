"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from concurrent.futures import ThreadPoolExecutor
import json
from threading import Event

from notebook.base.handlers import APIHandler
from tornado import gen, web
from tornado.concurrent import run_on_executor

from .commands import build, clean, build_check


class Builder(object):
    building = False
    executor = ThreadPoolExecutor(max_workers=5)
    canceled = False
    _canceling = False
    _kill_event = None
    _future = None

    def __init__(self, log, core_mode, app_dir):
        self.log = log
        self.core_mode = core_mode
        self.app_dir = app_dir

    @gen.coroutine
    def get_status(self):
        if self.core_mode:
            raise gen.Return(dict(status='stable', message=''))
        if self.building:
            raise gen.Return(dict(status='building', message=''))

        try:
            messages = yield self._run_build_check(self.app_dir, self.log)
            status = 'needed' if messages else 'stable'
            if messages:
                self.log.warn('Build recommended')
                [self.log.warn(m) for m in messages]
            else:
                self.log.info('Build is up to date')
        except ValueError as e:
            self.log.warn(
                'Could not determine jupyterlab build status without nodejs'
            )
            status = 'stable'
            messages = []

        raise gen.Return(dict(status=status, message='\n'.join(messages)))

    @gen.coroutine
    def build(self):
        if self._canceling:
            raise ValueError('Cancel in progress')
        if not self.building:
            self.canceled = False
            self._future = future = gen.Future()
            self.building = True
            self._kill_event = evt = Event()
            try:
                yield self._run_build(self.app_dir, self.log, evt)
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

    @run_on_executor
    def _run_build_check(self, app_dir, logger):
        return build_check(app_dir=app_dir, logger=logger)

    @run_on_executor
    def _run_build(self, app_dir, logger, kill_event):
        kwargs = dict(app_dir=app_dir, logger=logger, kill_event=kill_event)
        try:
            return build(**kwargs)
        except Exception as e:
            if self._kill_event.is_set():
                return
            self.log.warn('Build failed, running a clean and rebuild')
            clean(app_dir)
            return build(**kwargs)


class BuildHandler(APIHandler):

    def initialize(self, builder):
        self.builder = builder

    @web.authenticated
    @gen.coroutine
    def get(self):
        data = yield self.builder.get_status()
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
