"""Announcements handler for JupyterLab."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import time
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass, field
from typing import Awaitable, Optional

from jupyter_server.base.handlers import APIHandler
from jupyterlab_server.translation_utils import translator
from packaging.version import parse
from tornado import httpclient, web

from .._version import __version__

ISO8601_FORMAT = "%Y-%m-%dT%H:%M:%S%z"
JUPYTERLAB_LAST_RELEASE_URL = "https://pypi.org/pypi/jupyterlab/json"
JUPYTERLAB_RELEASE_URL = "https://github.com/jupyterlab/jupyterlab/releases/tag/v"


@dataclass(frozen=True)
class Notification:
    """Notification

    Attributes:
        message: Notification message
        type: Notification type — ["default", "error", "info", "success", "warning"]
        options: Notification options
    """

    createdAt: float
    message: str
    modifiedAt: float
    type: str = "default"
    options: dict = field(default_factory=dict)


class CheckForUpdate:
    """Default class to check for update.

    Args:
        version: Current JupyterLab version
    """

    def __init__(self, version: str) -> None:
        self._version = version

    async def __call__(self) -> Awaitable[Optional[str]]:
        """Get the notification message if a new version is available.

        Returns:
            The notification message or None if there is not update.
        """
        http_client = httpclient.AsyncHTTPClient()
        try:
            response = await http_client.fetch(
                JUPYTERLAB_LAST_RELEASE_URL,
                headers={"Content-Type": "application/json"},
            )
            data = json.loads(response.body).get("info")
            last_version = data["version"]
        except Exception as e:
            self.log.debug("Failed to get latest version", exc_info=e)
        else:
            if parse(__version__) < parse(last_version):
                trans = translator.load("jupyterlab")
                return trans.__(
                    f"A newer version ({last_version}) of JupyterLab is available.\nSee the [changelog]({JUPYTERLAB_RELEASE_URL}{last_version}) for more information."
                )
            else:
                return None


class NeverCheckForUpdate(CheckForUpdate):
    """Check update version that does nothing.

    This is provided for administrators that want to
    turn off requesting external resources.
    """

    async def __call__(self) -> Awaitable[Optional[str]]:
        """Get the notification message if a new version is available.

        Returns:
            The notification message or None if there is not update.
        """
        return None


class AnnouncementHandler(APIHandler):
    """Announcement API handler.

    Args:
        announcements_url: The Atom feed to fetch for announcements
        update_check: The class checking for a new version
    """

    def initialize(
        self,
        announcements_url: Optional[str] = None,
        update_checker: Optional[CheckForUpdate] = None,
    ) -> None:
        super().initialize()
        self.announcements_url = announcements_url
        self.update_checker = (
            NeverCheckForUpdate(__version__) if update_checker is None else update_checker
        )

    @web.authenticated
    async def get(self):
        """Get the announcements and check for updates.

        Query args:
            check_update: Whether to check for update or not ["0", "1"].
        Response:
            {
                "announcements": List[Notification]
            }
        """
        check_update = self.get_argument("check_update", "0") == "1"
        announcements = []

        http_client = httpclient.AsyncHTTPClient()

        if self.announcements_url is not None:
            # Those registration are global, naming them to reduce chance of clashes
            xml_namespaces = {"atom": "http://www.w3.org/2005/Atom"}
            for key, spec in xml_namespaces.items():
                ET.register_namespace(key, spec)

            try:
                response = await http_client.fetch(
                    self.announcements_url,
                    headers={"Content-Type": "application/atom+xml"},
                )
                tree = ET.fromstring(response.body)

                def build_entry(node):
                    return Notification(
                        message=node.find("atom:title", xml_namespaces).text
                        # New paragraph
                        + "\n\n" + node.find("atom:summary", xml_namespaces).text
                        # Break line
                        + "  \n"
                        + "See {0}full post{1} for more details.".format(
                            '<a href="{}" target="_blank">'.format(
                                node.find("atom:link", xml_namespaces).get("href")
                            ),
                            "</a>",
                        ),
                        createdAt=time.strptime(
                            node.find("atom:published", xml_namespaces).text,
                            ISO8601_FORMAT,
                        ),
                        modifiedAt=time.strptime(
                            node.find("atom:updated", xml_namespaces).text,
                            ISO8601_FORMAT,
                        ),
                        type="info",
                        options={"data": {"tags": ["announcement"]}},
                    )

                announcements.extend(map(build_entry, tree.findall("atom:entry", xml_namespaces)))
            except Exception as e:
                self.log.debug(
                    f"Failed to get announcements from Atom feed: {self.announcements_url}",
                    exc_info=e,
                )

        if check_update:
            message = await self.update_checker()
            if message:
                now = time.time() * 1000.0
                announcements.append(
                    Notification(
                        message,
                        now,
                        now,
                        "info",
                        {"data": {"tags": ["announcement", "update"]}},
                    )
                )

        self.set_status(200)
        self.finish(json.dumps({"announcements": list(map(asdict, announcements))}))


announcement_handler_path = r"/lab/api/announcements"
