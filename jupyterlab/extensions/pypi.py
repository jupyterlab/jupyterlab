"""Extensions manager using pip as package manager and PyPi.org as packages source."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import asyncio
import json
import re
import sys
import xmlrpc.client
from functools import partial
from itertools import groupby
from subprocess import run
from typing import Any, Callable, Dict, Optional, Tuple

import tornado
from async_lru import alru_cache

from jupyterlab.extensions.manager import (
    ActionResult,
    ExtensionPackage,
    ExtensionsManager,
)


@alru_cache(maxsize=500)
async def _fetch_package_metadata(name: str, latest_version: str) -> dict:
    http_client = tornado.httpclient.AsyncHTTPClient()
    response = await http_client.fetch(
        PyPiExtensionsManager.BASE_URL + f"/{name}/{latest_version}/json",
        headers={"Content-Type": "application/json"},
    )
    data = json.loads(response.body).get("info")

    # Keep minimal information to limit cache size
    return {k: data.get(k) for k in ["summary", "home_page"]}


class PyPiExtensionsManager(ExtensionsManager):
    """Extensions manager using pip as package manager and PyPi.org as packages source."""

    # Base PyPI server URL
    BASE_URL = "https://pypi.org/pypi"
    # PyPi.org XML-RPC API throttling time between request in seconds.
    PYPI_REQUEST_THROTTLING: float = 1.0

    def __init__(
        self, app_options: Optional[dict] = None, ext_options: Optional[dict] = None
    ) -> None:
        super().__init__(app_options, ext_options)
        # Combine XML RPC API and JSON API to reduce throttling by PyPI.org
        self._http_client = tornado.httpclient.AsyncHTTPClient()
        self._rpc_client = xmlrpc.client.ServerProxy(PyPiExtensionsManager.BASE_URL)

    @property
    def can_install(self) -> bool:
        """Whether the manager can un-/install extensions or not.

        Returns:
            The installation capability flag
        """
        return True

    async def get_latest_version(self, pkg: str) -> Optional[str]:
        """Return the latest available version for a given extension.

        Args:
            pkg: The extension to search for
        Returns:
            The latest available version
        """
        try:
            http_client = tornado.httpclient.AsyncHTTPClient()
            response = await http_client.fetch(
                PyPiExtensionsManager.BASE_URL + f"/{pkg}/json",
                headers={"Content-Type": "application/json"},
            )
            data = json.loads(response.body).get("info")
        except Exception:
            return None
        else:
            return data.get("version")

    def get_normalized_name(self, extension: ExtensionPackage) -> str:
        """Normalize extension name.

        Extension have multiple parts, npm package, Python package,...
        Sub-classes may override this method to ensure the name of
        an extension from the service provider and the local installed
        listing is matching.

        Args:
            extension: The extension metadata
        Returns:
            The normalized name
        """
        if extension.install is not None:
            install_metadata = extension.install
            if install_metadata["packageManager"] == "python":
                return self._normalize_name(install_metadata["packageName"])
        return self._normalize_name(extension.name)

    async def __throttleRequest(self, recursive: bool, fn: Callable, *args) -> Any:
        """Throttle XMLRPC API request

        Args:
            recursive: Whether to call the throttling recursively once or not.
            fn: API method to call
            *args: API method arguments
        Returns:
            Result of the method
        Raises:
            xmlrpc.client.Fault
        """
        current_loop = tornado.ioloop.IOLoop.current()
        try:
            data = await current_loop.run_in_executor(None, fn, *args)
        except xmlrpc.client.Fault as err:
            if err.faultCode == -32500 and err.faultString.startswith("HTTPTooManyRequests:"):
                delay = 1.01
                match = re.search(r"Limit may reset in (\d+) seconds.", err.faultString)
                if match is not None:
                    delay = int(match.group(1) or "1")
                self.log.info(
                    f"HTTPTooManyRequests - Perform next call to PyPI XMLRPC API in {delay}s."
                )
                await asyncio.sleep(delay * PyPiExtensionsManager.PYPI_REQUEST_THROTTLING + 0.01)
                if recursive:
                    data = await self.__throttleRequest(False, fn, *args)
                else:
                    data = await current_loop.run_in_executor(None, fn, *args)

        return data

    async def list_packages(
        self, query: str, page: int, per_page: int
    ) -> Tuple[Dict[str, ExtensionPackage], Optional[int]]:
        """List the available extensions.

        Note:
            This will list the packages based on the classifier
                Framework :: Jupyter :: JupyterLab :: Extensions :: Prebuilt

            Then it filters it with the query

            We do not try to check if they are compatible (version wise)

        Args:
            query: The search extension query
            page: The result page
            per_page: The number of results per page
        Returns:
            The available extensions in a mapping {name: metadata}
            The results last page; None if the manager does not support pagination
        """
        matches = await self.__throttleRequest(
            True,
            self._rpc_client.browse,
            ["Framework :: Jupyter :: JupyterLab :: Extensions :: Prebuilt"],
        )

        extensions = {}

        for name, group in groupby(filter(lambda m: query in m[0], matches), lambda e: e[0]):
            _, latest_version = list(group)[-1]
            data = await _fetch_package_metadata(name, latest_version)

            normalized_name = self._normalize_name(name)
            extensions[normalized_name] = ExtensionPackage(
                name=normalized_name,
                description=data.get("summary"),
                url=data.get("home_page"),
                latest_version=latest_version,
                pkg_type="prebuilt",
            )

        return extensions, None

    async def install(self, name: str, version: Optional[str] = None) -> ActionResult:
        """Install the required extension.

        Note:
            If the user must be notified with a message (like asking to restart the
            server), the result should be
            {"status": "warning", "message": "<explanation for the user>"}

        Args:
            name: The extension name
            version: The version to install; default None (i.e. the latest possible)
        Returns:
            The action result
        """
        current_loop = tornado.ioloop.IOLoop.current()
        cmdline = [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--no-input",
            "--progress-bar",
            "off",
        ]
        if version is not None:
            cmdline.append(f"{name}=={version}")
        else:
            cmdline.append(name)
        self.log.debug(f"Executing '{' '.join(cmdline)}'")

        result = await current_loop.run_in_executor(
            None, partial(run, cmdline, capture_output=True)
        )

        self.log.debug(f"return code: {result.returncode}")
        self.log.debug(f"stdout: {result.stdout.decode('utf-8')}")
        error = result.stderr.decode("utf-8")
        if result.returncode == 0:
            self.log.debug(f"stderr: {error}")
            return ActionResult(status="ok")
        else:
            self.log.error(f"Failed to installed {name}: code {result.returncode}\n{error}")
            return ActionResult(status="error", message=error)

    async def uninstall(self, extension: str) -> ActionResult:
        """Uninstall the required extension.

        Note:
            If the user must be notified with a message (like asking to restart the
            server), the result should be
            {"status": "warning", "message": "<explanation for the user>"}

        Args:
            extension: The extension name
        Returns:
            The action result
        """
        current_loop = tornado.ioloop.IOLoop.current()
        cmdline = [
            sys.executable,
            "-m",
            "pip",
            "uninstall",
            "--yes",
            "--no-input",
            extension,
        ]
        self.log.debug(f"Executing '{' '.join(cmdline)}'")

        result = await current_loop.run_in_executor(
            None, partial(run, cmdline, capture_output=True)
        )

        self.log.debug(f"return code: {result.returncode}")
        self.log.debug(f"stdout: {result.stdout.decode('utf-8')}")
        error = result.stderr.decode("utf-8")
        if result.returncode == 0:
            self.log.debug(f"stderr: {error}")
            return ActionResult(status="ok")
        else:
            self.log.error(f"Failed to installed {extension}: code {result.returncode}\n{error}")
            return ActionResult(status="error", message=error)

    def _normalize_name(self, name: str) -> str:
        """Normalize extension name.

        Remove `@` from npm scope and replace `/` and `_` by `-`.

        Args:
            name: Extension name
        Returns:
            Normalized name
        """
        return name.replace("@", "").replace("/", "-").replace("_", "-")
