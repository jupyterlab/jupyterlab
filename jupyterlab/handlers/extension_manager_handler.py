"""Tornado handlers for extension management."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import dataclasses
import json
from urllib.parse import urlencode, urlunparse

from jupyter_server.base.handlers import APIHandler
from tornado import web

from ..extensions.manager import ExtensionManager


class ExtensionHandler(APIHandler):
    def initialize(self, manager: ExtensionManager):
        super().initialize()
        self.manager = manager

    @web.authenticated
    async def get(self):
        """GET query returns info on extensions

        Query arguments:
            refresh: [optional] Force refreshing the list of extensions - ["0", "1"]; default 0
            query: [optional] Query to search for extensions - default None (i.e. returns installed extensions)
            page: [optional] Result page - default 1 (min. 1)
            per_page: [optional] Number of results per page - default 30 (max. 100)
        """
        query = self.get_argument("query", None)
        page = max(1, int(self.get_argument("page", "1")))
        per_page = min(100, int(self.get_argument("per_page", "30")))
        if self.get_argument("refresh", "0") == "1":
            await self.manager.refresh(query, page, per_page)

        extensions, last_page = await self.manager.list_extensions(query, page, per_page)

        self.set_status(200)
        if last_page is not None:
            links = []
            queryArgs = {"page": last_page, "per_page": per_page}
            if query is not None:
                queryArgs["query"] = query
            last = urlunparse(
                (
                    self.request.protocol,
                    self.request.host,
                    self.request.path,
                    "",
                    urlencode(queryArgs, doseq=True),
                    "",
                )
            )
            links.append(f'<{last}>; rel="last"')
            if page > 1:
                queryArgs["page"] = max(1, page - 1)
                prev = urlunparse(
                    (
                        self.request.protocol,
                        self.request.host,
                        self.request.path,
                        "",
                        urlencode(queryArgs, doseq=True),
                        "",
                    )
                )
                links.append(f'<{prev}>; rel="prev"')
            if page < last_page:
                queryArgs["page"] = min(page + 1, last_page)
                next = urlunparse(
                    (
                        self.request.protocol,
                        self.request.host,
                        self.request.path,
                        "",
                        urlencode(queryArgs, doseq=True),
                        "",
                    )
                )
                links.append(f'<{next}>; rel="next"')
            queryArgs["page"] = 1
            first = urlunparse(
                (
                    self.request.protocol,
                    self.request.host,
                    self.request.path,
                    "",
                    urlencode(queryArgs, doseq=True),
                    "",
                )
            )
            links.append(f'<{first}>; rel="first"')
            self.set_header("Link", ", ".join(links))

        self.finish(json.dumps(list(map(dataclasses.asdict, extensions))))

    @web.authenticated
    async def post(self):
        """POST query performs an action on a specific extension

        Body arguments:
            {
                "cmd": Action to perform - ["install", "uninstall", "enable", "disable"]
                "extension_name": Extension name
                "extension_version": [optional] Extension version (used only for install action)
            }
        """
        data = self.get_json_body()
        cmd = data["cmd"]
        name = data["extension_name"]
        version = data.get("extension_version")
        if cmd not in ("install", "uninstall", "enable", "disable") or not name:
            raise web.HTTPError(
                422,
                "Could not process instruction %r with extension name %r" % (cmd, name),
            )

        ret_value = None
        try:
            if cmd == "install":
                ret_value = await self.manager.install(name, version)
            elif cmd == "uninstall":
                ret_value = await self.manager.uninstall(name)
            elif cmd == "enable":
                ret_value = await self.manager.enable(name)
            elif cmd == "disable":
                ret_value = await self.manager.disable(name)
        except Exception as e:
            raise web.HTTPError(500, str(e)) from e

        if ret_value.status == "error":
            self.set_status(500)
        else:
            self.set_status(201)
        self.finish(json.dumps(dataclasses.asdict(ret_value)))


# The path for lab extensions handler.
extensions_handler_path = r"/lab/api/extensions"
