"""Base classes for the extension manager."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import abc
import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, Optional, Set

import requests
from tornado import ioloop

from ..commands import (
    _AppHandler,
    _ensure_options,
    disable_extension,
    enable_extension,
    get_app_info,
)


def _ensure_compat_errors(info, app_options):
    """Ensure that the app info has compat_errors field"""
    handler = _AppHandler(app_options)
    info["compat_errors"] = handler._get_extension_compat()


_message_map = {
    "install": re.compile(r"(?P<name>.*) needs to be included in build"),
    "uninstall": re.compile(r"(?P<name>.*) needs to be removed from build"),
    "update": re.compile(r"(?P<name>.*) changed from (?P<oldver>.*) to (?P<newver>.*)"),
}


def _build_check_info(app_options):
    """Get info about packages scheduled for (un)install/update"""
    handler = _AppHandler(app_options)
    messages = handler.build_check(fast=True)
    # Decode the messages into a dict:
    status = {"install": [], "uninstall": [], "update": []}
    for msg in messages:
        for key, pattern in _message_map.items():
            match = pattern.match(msg)
            if match:
                status[key].append(match.group("name"))
    return status


@dataclass
class ExtensionPackage:
    """Extension package entry.

    Attributes:
        name: Package name
        description: Package description
        url: Package home page
        pkg_type: Type of package - ["prebuilt", "source"]
        enabled: [optional] Whether the package is enabled or not -  default False
        core: [optiona] Whether the package is a core package or not - default False
        latest_version: [optional] Latest available version - default ""
        installed_version: [optional] Installed version - default ""
        status: [optional] Package status - ["ok", "warning", "error"]; default "ok"
        companion: [optional] Type of companion for the frontend extension - [None, "kernel", "server"]; default None
        install: [optional] Extension package installation instructions - default None
        installed: [optional] Whether the extension is currently installed - default None
        is_allowed: [optional] Whether this extension is allowed or not - default True
    """

    name: str
    description: str
    url: str
    pkg_type: str
    companion: Optional[str] = None
    core: bool = False
    enabled: bool = False
    install: Optional[dict] = None
    installed: Optional[bool] = None
    installed_version: str = ""
    is_allowed: bool = True
    latest_version: str = ""
    status: str = "ok"


@dataclass
class ActionResult:
    """Action result

    Attributes:
        status: Action status - ["ok", "warning", "error"]
        message: Action status explanation
    """

    status: str  # FIXME
    message: Optional[str] = None


@dataclass
class ExtensionsOption:
    """Extension manager options.

    Attributes:
        allowed_extensions_uris: A list of comma-separated URIs to get the allowed extensions list
        blocked_extensions_uris: A list of comma-separated URIs to get the blocked extensions list
        listings_refresh_seconds: The interval delay in seconds to refresh the lists
        listings_request_options: The optional kwargs to use for the listings HTTP requests as described on https://2.python-requests.org/en/v2.7.0/api/#requests.request
    """

    allowed_extensions_uris: Set[str] = field(default_factory=set)
    blocked_extensions_uris: Set[str] = field(default_factory=set)
    listings_refresh_seconds: int = 60 * 60
    listings_request_options: dict = field(default_factory=dict)


class ExtensionsManager(abc.ABC):
    """Base abstract extensions manager.

    Note:
        Any concrete implementation will need to implement the five
        following abstract methods:
        - :ref:`can_install`
        - :ref:`get_latest_version`
        - :ref:`list_packages`
        - :ref:`install`
        - :ref:`uninstall`

        It could be interesting to override the :ref:`get_normalized_name`
        method too.

    Args:
        app_options: Application options
        ext_options: Extensions manager options

    Attributes:
        log: Logger
        app_dir: Application directory
        core_config: Core configuration
        app_options: Application options
        options: Extensions manager options
    """

    def __init__(
        self, app_options: Optional[dict] = None, ext_options: Optional[dict] = None
    ) -> None:
        app_options = _ensure_options(app_options)
        self.log = app_options.logger
        self.app_dir = Path(app_options.app_dir)
        self.core_config = app_options.core_config
        self.app_options = app_options
        self.options = ExtensionsOption(**(ext_options or {}))
        self._extensions_cache: Optional[Dict[str, ExtensionPackage]] = None
        self._listings_cache: Optional[dict] = None
        self._listings_block_mode = True

        self._listing_fetch: Optional[ioloop.PeriodicCallback] = None
        if len(self.options.allowed_extensions_uris) or len(self.options.blocked_extensions_uris):
            self._listings_block_mode = len(self.options.allowed_extensions_uris) == 0

            self._listing_fetch = ioloop.PeriodicCallback(
                lambda: self._fetch_listings(),
                callback_time=self.options.listings_refresh_seconds * 1000,
                jitter=0.1,
            )
            self._listing_fetch.start()

    def __del__(self):
        if self._listing_fetch is not None:
            self._listing_fetch.stop()

    @property
    @abc.abstractmethod
    def can_install(self) -> bool:
        """Whether the manager can un-/install extensions or not.

        Returns:
            The installation capability flag
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def get_latest_version(self, extension: str) -> Optional[str]:
        """Return the latest available version for a given extension.

        Args:
            pkg: The extension name
        Returns:
            The latest available version
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def list_packages(self) -> Dict[str, ExtensionPackage]:
        """List the available extensions.

        Returns:
            The available extensions in a mapping {name: metadata}
        """
        raise NotImplementedError()

    @abc.abstractmethod
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
        raise NotImplementedError()

    @abc.abstractmethod
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
        raise NotImplementedError()

    async def disable(self, extension: str) -> ActionResult:
        """Disable an extension.

        Args:
            extension: The extension name
        Returns:
            The action result
        """
        disable_extension(extension, app_options=self.app_options)
        raise ActionResult(
            status="ok",
        )

    async def enable(self, extension: str) -> ActionResult:
        """Enable an extension.

        Args:
            extension: The extension name
        Returns:
            The action result
        """
        enable_extension(extension, app_options=self.app_options)
        return ActionResult(
            status="ok",
        )

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
        return extension.name

    async def list_extensions(self, query: str = "") -> Set[ExtensionPackage]:
        """List extensions for a given ``query`` search term.

        This will return the extensions installed or available if
        allowed by the listing settings.

        Args:
            query: [optional] Query search term.

        Returns:
            The extensions
        """
        if self._extensions_cache is None:
            await self.refresh()

        # filter using listings settings
        if self._listings_cache is None and self._listing_fetch is not None:
            self._listing_fetch.callback()

        extensions = set(self._extensions_cache.values())
        if self._listings_cache is not None:
            listing = list(self._listings_cache)
            extensions = set()
            if self._listings_block_mode:
                for name, ext in self._extensions_cache.items():
                    if name not in listing:
                        ext.is_allowed = True
                        extensions.add(ext)
                    elif ext.installed_version:
                        self.log.warning(f"Blocked extension '{name}' is installed.")
                        ext.is_allowed = False
                        extensions.add(ext)
            else:
                for name, ext in self._extensions_cache.items():
                    if name in listing:
                        ext.is_allowed = True
                        extensions.add(ext)
                    elif ext.installed_version:
                        self.log.warning(f"Not allowed extension '{name}' is installed.")
                        ext.is_allowed = False
                        extensions.add(ext)

        return extensions

    async def refresh(self) -> None:
        """Refresh the list of extensions."""
        self._extensions_cache = None
        await self._update_extensions_list()

    def _fetch_listings(self) -> None:
        """Fetch the listings for the extension manager."""
        rules = []
        if self._listings_block_mode:
            if len(self.options.blocked_extensions_uris):
                self.log.info(
                    f"Fetching blocked extensions from {self.options.blocked_extensions_uris}"
                )
                for blocked_extensions_uri in self.options.blocked_extensions_uris:
                    r = requests.request(
                        "GET",
                        blocked_extensions_uri,
                        **self.options.listings_request_opts,
                    )
                    j = json.loads(r.text)
                    rules.extend(j.get("blocked_extensions", []))
        elif len(self.options.allowed_extensions_uris):
            self.log.info(
                f"Fetching allowed extensions from { self.options.allowed_extensions_uris}"
            )
            for allowed_extensions_uri in self.options.allowed_extensions_uris:
                r = requests.request(
                    "GET", allowed_extensions_uri, **self.options.listings_request_opts
                )
                j = json.loads(r.text)
                rules.extend(j.get("allowed_extensions", []))

        self._listings_cache = dict([(r["name"], r) for r in rules])

    async def _get_installed_extensions(
        self, get_latest_version=True
    ) -> Dict[str, ExtensionPackage]:
        """Get the installed extensions.

        Args:
            get_latest_version: Whether to fetch the latest extension version or not.
        Returns:
            The installed extensions as a mapping {name: metadata}
        """
        app_options = self.app_options
        info = get_app_info(app_options=app_options)
        build_check_info = _build_check_info(app_options)
        _ensure_compat_errors(info, app_options)
        extensions = {}

        # TODO: the three for-loops below can be run concurrently
        for name, data in info["federated_extensions"].items():
            status = "ok"
            pkg_info = data
            if info["compat_errors"].get(name, None):
                status = "error"

            normalized_name = self._normalize_name(name)
            pkg = ExtensionPackage(
                name=normalized_name,
                description=pkg_info.get("description", ""),
                url=data.get("url", ""),
                enabled=(name not in info["disabled"]),
                core=False,
                latest_version=data["version"],
                installed_version=data["version"],
                status=status,
                install=data.get("install", {}),
                pkg_type="prebuilt",
                companion=self._get_companion(data),
            )
            if get_latest_version:
                pkg["latest_version"] = await self.get_latest_version(pkg)
            extensions[normalized_name] = pkg

        for name, data in info["extensions"].items():
            if name in info["shadowed_exts"]:
                continue
            status = "ok"

            if info["compat_errors"].get(name, None):
                status = "error"
            else:
                for packages in build_check_info.values():
                    if name in packages:
                        status = "warning"

            normalized_name = self._normalize_name(name)
            pkg = ExtensionPackage(
                name=normalized_name,
                description=data.get("description", ""),
                url=data["url"],
                enabled=(name not in info["disabled"]),
                core=False,
                latest_version=data["version"],
                installed_version=data["version"],
                status=status,
                pkg_type="source",
                companion=self._get_companion(data),
            )
            if get_latest_version:
                pkg["latest_version"] = await self.get_latest_version(pkg)
            extensions[normalized_name] = pkg

        for name in build_check_info["uninstall"]:
            data = self._get_scheduled_uninstall_info(name)
            if data is not None:
                normalized_name = self._normalize_name(name)
                pkg = ExtensionPackage(
                    name=normalized_name,
                    description=data.get("description", ""),
                    url=data.get("homepage", ""),
                    installed=False,
                    enabled=False,
                    core=False,
                    latest_version=data["version"],
                    installed_version=data["version"],
                    status="warning",
                    pkg_type="prebuilt",
                )
                extensions[normalized_name] = pkg

        return extensions

    def _get_companion(self, data: dict) -> Optional[str]:
        companion = None
        if "discovery" in data["jupyterlab"]:
            if "server" in data["jupyterlab"]["discovery"]:
                companion = "server"
            elif "kernel" in data["jupyterlab"]["discovery"]:
                companion = "kernel"
        return companion

    def _get_scheduled_uninstall_info(self, name) -> Optional[dict]:
        """Get information about a package that is scheduled for uninstallation"""
        target = self.app_dir / "staging" / "node_modules" / name / "package.json"
        if target.exists():
            with target.open() as fid:
                return json.load(fid)
        else:
            return None

    async def _update_extensions_list(self) -> None:
        """Update the list of extensions"""
        # Get the available extensions
        extensions = await self.list_packages()

        # Get the installed extensions
        extensions.update(await self._get_installed_extensions())

        self._extensions_cache = extensions
