"""Tornado handlers for extension management."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os
import re

from concurrent.futures import ThreadPoolExecutor

from tornado import web

from jupyterlab_launcher.server import APIHandler

from .commands import (
    get_app_info, install_extension, uninstall_extension,
    enable_extension, disable_extension, read_package,
    _AppHandler, get_latest_compatible_package_versions
)


def _make_extension_entry(name, description, url, enabled, core, latest_version,
                          installed_version, status, installed=None):
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
    )
    if installed is not None:
        ret['installed'] = installed
    return ret


def _ensure_compat_errors(info, app_dir, logger):
    """Ensure that the app info has compat_errors field"""
    handler = _AppHandler(app_dir, logger)
    info['compat_errors'] = handler._get_extension_compat()


_message_map = {
    'install': re.compile(r'(?P<name>.*) needs to be included in build'),
    'uninstall': re.compile(r'(?P<name>.*) needs to be removed from build'),
    'update': re.compile(r'(?P<name>.*) changed from (?P<oldver>.*) to (?P<newver>.*)'),
}


def _build_check_info(app_dir, logger):
    """Get info about packages scheduled for (un)install/update"""
    handler = _AppHandler(app_dir, logger)
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

    def __init__(self, log, app_dir):
        self.log = log
        self.app_dir = app_dir
        self._outdated = None
        # To start fetching data on outdated extensions immediately, uncomment:
        # IOLoop.current().spawn_callback(self._get_outdated)

    async def list_extensions(self):
        """Handle a request for all installed extensions"""
        info = get_app_info(app_dir=self.app_dir, logger=self.log)
        build_check_info = _build_check_info(self.app_dir, self.log)
        _ensure_compat_errors(info, self.app_dir, self.log)
        extensions = []
        # TODO: Ensure loops can run in parallel
        for name, data in info['extensions'].items():
            status = 'ok'
            pkg_info = await self._get_pkg_info(name, data)
            if info['compat_errors'].get(name, None):
                status = 'error'
            else:
                for packages in build_check_info.values():
                    if name in packages:
                        status = 'warning'
            extensions.append(_make_extension_entry(
                name=name,
                description=pkg_info['description'],
                url=data['url'],
                enabled=(name not in info['disabled']),
                core=False,
                # Use wanted version to ensure we limit ourselves
                # within semver restrictions
                latest_version=pkg_info['latest_version'],
                installed_version=data['version'],
                status=status,
            ))
        for name in build_check_info['uninstall']:
            data = self._get_scheduled_uninstall_info(name)
            if data is not None:
                extensions.append(_make_extension_entry(
                    name=name,
                    description=data['description'],
                    url=data.get('homepage', ''),
                    installed=False,
                    enabled=False,
                    core=False,
                    latest_version=data['version'],
                    installed_version=data['version'],
                    status='warning',
                ))
        return extensions

    def install(self, extension):
        """Handle an install/update request"""
        try:
            install_extension(extension, app_dir=self.app_dir, logger=self.log)
        except ValueError as e:
            return dict(status='error', message=str(e))
        return dict(status='ok',)

    def uninstall(self, extension):
        """Handle an uninstall request"""
        did_uninstall = uninstall_extension(extension, app_dir=self.app_dir, logger=self.log)
        return dict(status='ok' if did_uninstall else 'error',)

    def enable(self, extension):
        """Handle an enable request"""
        enable_extension(extension, app_dir=self.app_dir, logger=self.log)
        return dict(status='ok',)

    def disable(self, extension):
        """Handle a disable request"""
        disable_extension(extension, app_dir=self.app_dir, logger=self.log)
        return dict(status='ok',)

    def _get_pkg_info(self, name, data):
        """Get information about a package"""
        info = read_package(data['path'])

        # Get latest version that is compatible with current lab:
        outdated = self._get_outdated()
        if outdated and name in outdated:
            info['latest_version'] = outdated[name]
        else:
            # Fallback to indicating that current is latest
            info['latest_version'] = info['version']

        return info

    async def _get_outdated(self):
        """Get a Future to information from `npm/yarn outdated`.

        This will cache the results. To refresh the cache, set
        self._outdated to None before calling. To bypass the cache,
        call self._load_outdated directly.
        """
        # Ensure self._outdated is a Future for data on outdated extensions
        if self._outdated is None:
            self._outdated = await self._load_outdated()
        # Return the Future
        return self._outdated

    async def refresh_outdated(self):
        self._outdated = await self._load_outdated()
        return self._outdated

    async def _load_outdated(self):
        """Get the latest compatible version"""
        info = get_app_info(app_dir=self.app_dir, logger=self.log)
        names = tuple(info['extensions'].keys())
        data = await self.executor.submit(
            get_latest_compatible_package_versions,
            names,
            app_dir=self.app_dir,
            logger=self.log,
        )
        return data

    def _get_scheduled_uninstall_info(self, name):
        """Get information about a package that is scheduled for uninstallation"""
        target = os.path.join(
            self.app_dir, 'staging', 'node_modules', name, 'package.json')
        if os.path.exists(target):
            with open(target) as fid:
                return json.load(fid)


class ExtensionHandler(APIHandler):

    def initialize(self, manager):
        self.manager = manager

    @web.authenticated
    async def get(self):
        """GET query returns info on all installed extensions"""
        if self.get_argument('refresh', False) == '1':
            await self.manager.refresh_outdated()
        extensions = await self.manager.list_extensions()
        self.finish(json.dumps(extensions))

    @web.authenticated
    async def post(self):
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
                ret_value = self.manager.install(name)
            elif cmd == 'uninstall':
                ret_value = self.manager.uninstall(name)
            elif cmd == 'enable':
                ret_value = self.manager.enable(name)
            elif cmd == 'disable':
                ret_value = self.manager.disable(name)
        except Exception as e:
            raise web.HTTPError(500, str(e))

        if ret_value is None:
            self.set_status(200)
        else:
            self.finish(json.dumps(ret_value))


# The path for lab extensions handler.
extensions_handler_path = r"/lab/api/extensions"
