"""Tornado handlers for extension management."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os
import re

from concurrent.futures import ThreadPoolExecutor

from jupyter_server.base.handlers import APIHandler
from jupyter_server.extension.handler import ExtensionHandlerMixin

from tornado import gen, web

from ..commands import (
    get_app_info, install_extension, uninstall_extension,
    enable_extension, disable_extension, read_package,
    _AppHandler, get_latest_compatible_package_versions,
    AppOptions, _ensure_options
)


def _make_extension_entry(name, description, url, enabled, core, latest_version,
                          installed_version, status, pkg_type, installed=None, install=None):
    """Create an extension entry that can be sent to the client"""
    ret = dict(
        name=name,
        description=description,
        url=url,
        enabled=enabled,
        core=core,
        latest_version=latest_version,
        installed_version=installed_version,
        status=status,
        pkg_type=pkg_type
    )
    if installed is not None:
        ret['installed'] = installed
    if install is not None:
        ret['install'] = install
    return ret


def _ensure_compat_errors(info, app_options):
    """Ensure that the app info has compat_errors field"""
    handler = _AppHandler(app_options)
    info['compat_errors'] = handler._get_extension_compat()


_message_map = {
    'install': re.compile(r'(?P<name>.*) needs to be included in build'),
    'uninstall': re.compile(r'(?P<name>.*) needs to be removed from build'),
    'update': re.compile(r'(?P<name>.*) changed from (?P<oldver>.*) to (?P<newver>.*)'),
}

def _build_check_info(app_options):
    """Get info about packages scheduled for (un)install/update"""
    handler = _AppHandler(app_options)
    messages = handler.build_check(fast=True)
    # Decode the messages into a dict:
    status = {'install': [], 'uninstall': [], 'update': []}
    for msg in messages:
        for key, pattern in _message_map.items():
            match = pattern.match(msg)
            if match:
                status[key].append(match.group('name'))
    return status


class ExtensionManager(object):
    executor = ThreadPoolExecutor(max_workers=1)

    def __init__(self, app_options=None):
        app_options = _ensure_options(app_options)
        self.log = app_options.logger
        self.app_dir = app_options.app_dir
        self.core_config = app_options.core_config
        self.app_options = app_options
        self._outdated = None
        # To start fetching data on outdated extensions immediately, uncomment:
        # IOLoop.current().spawn_callback(self._get_outdated)

    @gen.coroutine
    def list_extensions(self):
        """Handle a request for all installed extensions"""
        app_options = self.app_options
        info = get_app_info(app_options=app_options)
        build_check_info = _build_check_info(app_options)
        _ensure_compat_errors(info, app_options)
        extensions = []

        # TODO: the three for-loops below can be run concurrently
        for name, data in info['federated_extensions'].items():
            status = 'ok'
            pkg_info = data #yield self._get_pkg_info(name, data)
            if info['compat_errors'].get(name, None):
                status = 'error'
            extensions.append(_make_extension_entry(
                name=name,
                description=pkg_info.get('description', ''),
                url=data.get('url', ''),
                enabled=(name not in info['disabled']),
                core=False,
                # Use wanted version to ensure we limit ourselves
                # within semver restrictions
                latest_version=data['version'],
                installed_version=data['version'],
                status=status,
                install=data.get('install', {}),
                pkg_type='prebuilt'
            ))

        for name, data in info['extensions'].items():
            if name in info['shadowed_exts']:
                continue
            status = 'ok'
            pkg_info = yield self._get_pkg_info(name, data)
            if info['compat_errors'].get(name, None):
                status = 'error'
            else:
                for packages in build_check_info.values():
                    if name in packages:
                        status = 'warning'
            extensions.append(_make_extension_entry(
                name=name,
                description=pkg_info.get('description', ''),
                url=data['url'],
                enabled=(name not in info['disabled']),
                core=False,
                # Use wanted version to ensure we limit ourselves
                # within semver restrictions
                latest_version=pkg_info['latest_version'],
                installed_version=data['version'],
                status=status,
                pkg_type='source'
            ))
        for name in build_check_info['uninstall']:
            data = yield self._get_scheduled_uninstall_info(name)
            if data is not None:
                extensions.append(_make_extension_entry(
                    name=name,
                    description=data.get('description', ''),
                    url=data.get('homepage', ''),
                    installed=False,
                    enabled=False,
                    core=False,
                    latest_version=data['version'],
                    installed_version=data['version'],
                    status='warning',
                    pkg_type='prebuilt'
                ))
        raise gen.Return(extensions)

    @gen.coroutine
    def install(self, extension):
        """Handle an install/update request"""
        try:
            install_extension(extension, app_options=self.app_options)
        except ValueError as e:
            raise gen.Return(dict(status='error', message=str(e)))
        raise gen.Return(dict(status='ok',))

    @gen.coroutine
    def uninstall(self, extension):
        """Handle an uninstall request"""
        did_uninstall = uninstall_extension(
            extension, app_options=self.app_options)
        raise gen.Return(dict(status='ok' if did_uninstall else 'error',))

    @gen.coroutine
    def enable(self, extension):
        """Handle an enable request"""
        enable_extension(extension, app_options=self.app_options)
        raise gen.Return(dict(status='ok',))

    @gen.coroutine
    def disable(self, extension):
        """Handle a disable request"""
        disable_extension(extension, app_options=self.app_options)
        raise gen.Return(dict(status='ok',))

    @gen.coroutine
    def _get_pkg_info(self, name, data):
        """Get information about a package"""
        info = read_package(data['path'])

        # Get latest version that is compatible with current lab:
        outdated = yield self._get_outdated()
        if outdated and name in outdated:
            info['latest_version'] = outdated[name]
        else:
            # Fallback to indicating that current is latest
            info['latest_version'] = info['version']

        raise gen.Return(info)

    def _get_outdated(self):
        """Get a Future to information from `npm/yarn outdated`.

        This will cache the results. To refresh the cache, set
        self._outdated to None before calling. To bypass the cache,
        call self._load_outdated directly.
        """
        # Ensure self._outdated is a Future for data on outdated extensions
        if self._outdated is None:
            self._outdated = self._load_outdated()
        # Return the Future
        return self._outdated

    def refresh_outdated(self):
        self._outdated = self._load_outdated()
        return self._outdated

    @gen.coroutine
    def _load_outdated(self):
        """Get the latest compatible version"""
        info = get_app_info(app_options=self.app_options)
        names = tuple(info['extensions'].keys())
        data = yield self.executor.submit(
            get_latest_compatible_package_versions,
            names,
            app_options=self.app_options
        )
        raise gen.Return(data)

    @gen.coroutine
    def _get_scheduled_uninstall_info(self, name):
        """Get information about a package that is scheduled for uninstallation"""
        target = os.path.join(
            self.app_dir, 'staging', 'node_modules', name, 'package.json')
        if os.path.exists(target):
            with open(target) as fid:
                raise gen.Return(json.load(fid))
        else:
            raise gen.Return(None)


class ExtensionHandler(ExtensionHandlerMixin, APIHandler):

    def initialize(self, manager=None, name=None):
        super(ExtensionHandler, self).initialize(name=name)
        self.manager = manager

    @web.authenticated
    @gen.coroutine
    def get(self):
        """GET query returns info on all installed extensions"""
        if self.get_argument('refresh', False) == '1':
            yield self.manager.refresh_outdated()
        extensions = yield self.manager.list_extensions()
        self.finish(json.dumps(extensions))

    @web.authenticated
    @gen.coroutine
    def post(self):
        """POST query performs an action on a specific extension"""
        data = self.get_json_body()
        cmd = data['cmd']
        name = data['extension_name']
        if (cmd not in ('install', 'uninstall', 'enable', 'disable') or
                not name):
            raise web.HTTPError(
                422, 'Could not process instrution %r with extension name %r' % (
                    cmd, name))

        # TODO: Can we trust extension_name? Does it need sanitation?
        #       It comes from an authenticated session, but its name is
        #       ultimately from the NPM repository.
        ret_value = None
        try:
            if cmd == 'install':
                ret_value = yield self.manager.install(name)
            elif cmd == 'uninstall':
                ret_value = yield self.manager.uninstall(name)
            elif cmd == 'enable':
                ret_value = yield self.manager.enable(name)
            elif cmd == 'disable':
                ret_value = yield self.manager.disable(name)
        except gen.Return as e:
            ret_value = e.value
        except Exception as e:
            raise web.HTTPError(500, str(e))

        if ret_value is None:
            self.set_status(200)
        else:
            self.finish(json.dumps(ret_value))


# The path for lab extensions handler.
extensions_handler_path = r"/lab/api/extensions"
