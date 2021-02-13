"""Tornado handlers for license reporting."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
from pathlib import Path

from concurrent.futures import ThreadPoolExecutor

from tornado.platform.asyncio import to_tornado_future
from tornado import web, gen

from traitlets import Dict, default
from traitlets.config import LoggingConfigurable
from jupyter_server.base.handlers import APIHandler

from ..commands import AppOptions, get_app_info


# TODO: maybe better as JSON?
THIRD_PARTY_LICENSES = "third-party-licenses.txt"

# The path for lab licenses handler.
licenses_handler_path = r"/lab/api/licenses"


class LicensesManager(LoggingConfigurable):
    """ A manager for listing the licenses for all frontend end code distributed
        by an application and any federated extensions
    """
    executor = ThreadPoolExecutor(max_workers=1)

    app_info = Dict()

    @default("app_info")
    def _default_app_info(self):
        """Lazily load the app info. This is expensive, but probably the only
           way to be sure.
        """
        return get_app_info(
            AppOptions(
                logger=self.parent.log,
                app_dir=self.parent.app_dir,
                labextensions_path=[
                    *self.parent.extra_labextensions_path,
                    *self.parent.labextensions_path
                ]
            )
        )

    def license_bundle(self, path):
        """Return the content of a path's license bundle, or None if it doesn't exist"""
        licenses_path = path / THIRD_PARTY_LICENSES
        if not licenses_path.exists():
            return None
        return licenses_path.read_text(encoding="utf-8")

    def licenses(self) -> dict:
        """Read all of the licenses
            TODO: schema
        """
        app_licenses = self.license_bundle(Path(self.parent.app_dir) / "static")

        licenses = {
            self.parent.app_name: app_licenses,
            **{
                fed_ext: ext_info["license_text"]
                for ext_name, ext_info
                in self.app_info["federated_extensions"].items()
            }
        }

        return licenses

    @gen.coroutine
    def licenses_json(self) -> str:
        """ Asynchronous wrapper around the potentially slow job of locating
            and JSON-encoding all of the licenses
        """
        licenses = yield self.executor.submit(self.licenses)
        return licenses


class LicensesHandler(APIHandler):
    """ A handler for serving licenses used by the application
    """
    def initialize(self, manager: LicensesManager):
        super(LicensesHandler, self).initialize()
        self.manager = manager

    @web.authenticated
    async def get(self):
        """Return all the frontend licenses as JSON"""
        licenses_json = await self.manager.licenses_json()
        self.write(licenses_json)
