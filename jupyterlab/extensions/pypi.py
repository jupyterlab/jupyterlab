"""Extensions manager using pip as package manager and PyPi.org as packages source."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import sys
import xmlrpc.client
from functools import partial
from itertools import groupby
from subprocess import run
from typing import Dict, Optional

import tornado

from jupyterlab.extensions.manager import (
    ActionResult,
    ExtensionPackage,
    ExtensionsManager,
)


class PyPiExtensionsManager(ExtensionsManager):
    """Extensions manager using pip as package manager and PyPi.org as packages source."""

    def __init__(
        self, app_options: Optional[dict] = None, ext_options: Optional[dict] = None
    ) -> None:
        super().__init__(app_options, ext_options)
        self.rpcClient = xmlrpc.client.ServerProxy("https://pypi.org/pypi")

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
        current_loop = tornado.ioloop.IOLoop.current()
        latest_version = await current_loop.run_in_executor(
            None, self.rpcClient.package_releases, pkg
        )
        if len(latest_version) > 0:
            return latest_version[0]
        else:
            return None

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

    async def list_packages(self) -> Dict[str, ExtensionPackage]:
        """List the available extensions.

        Note:
            This will list the packages based on the classifier
                Framework :: Jupyter :: JupyterLab :: Extensions :: Prebuilt

            We do not try to check if they are compatible (version wise)

        Returns:
            The available extensions in a mapping {name: metadata}
        """
        current_loop = tornado.ioloop.IOLoop.current()
        matches = await current_loop.run_in_executor(
            None,
            self.rpcClient.browse["Framework :: Jupyter :: JupyterLab :: Extensions :: Prebuilt"],
        )

        extensions = {}

        for name, group in groupby(matches, lambda e: e[0]):
            _, latest_version = list(group)[-1]
            data = await current_loop.run_in_executor(
                None, self.rpcClient.release_data, name, latest_version
            )
            normalized_name = self._normalize_name(name)
            extensions[normalized_name] = ExtensionPackage(
                name=normalized_name,
                description=data.get("summary"),
                url=data.get("home_page"),
                latest_version=latest_version,
                pkg_type="prebuilt",
            )

        return extensions

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
        cmdline = [sys.executable, "-m", "pip", "install", "--no-input", "--progress-bar", "off"]
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
        cmdline = [sys.executable, "-m", "pip", "uninstall", "--yes", "--no-input", extension]
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
