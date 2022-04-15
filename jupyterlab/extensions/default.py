"""Extensions manager without installation capabilities."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from typing import Dict, Optional

from jupyterlab_server.translation_utils import translator

from .manager import ActionResult, ExtensionPackage, ExtensionsManager


class ReadOnlyExtensionsManager(ExtensionsManager):
    """Extensions manager without installation capabilities."""

    @property
    def can_install(self) -> bool:
        """Whether the manager can un-/install extensions or not.

        Returns:
            The installation capability flag
        """
        return False

    async def get_latest_version(self, pkg: str) -> Optional[str]:
        """Return the latest available version for a given extension.

        Args:
            pkg: The extension to search for
        Returns:
            The latest available version
        """
        return None

    async def list_packages(self) -> Dict[str, ExtensionPackage]:
        """List the available extensions.

        Returns:
            The available extensions in a mapping {name: metadata}
        """
        return {}

    async def install(self, extension: str, version: Optional[str] = None) -> ActionResult:
        """Install the required extension.

        Note:
            If the user must be notified with a message (like asking to restart the
            server), the result should be
            {"status": "warning", "message": "<explanation for the user>"}

        Args:
            extension: The extension name
            version: The version to install; default None (i.e. the latest possible)
        Returns:
            The action result
        """
        trans = translator.load("jupyterlab")
        raise ActionResult(
            status="error", message=trans.gettext("Extension installation not supported.")
        )

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
        trans = translator.load("jupyterlab")
        raise ActionResult(
            status="error", message=trans.gettext("Extension uninstallation not supported.")
        )
