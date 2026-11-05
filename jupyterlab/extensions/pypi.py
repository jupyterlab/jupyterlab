# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Extension manager using pip as package manager and PyPi.org as packages source."""

from __future__ import annotations

import asyncio
import io
import json
import math
import sys
import tempfile
from collections.abc import Awaitable, Callable
from functools import partial
from http import HTTPStatus
from os import environ
from pathlib import Path
from subprocess import CalledProcessError, run
from tarfile import TarFile
from time import monotonic
from typing import cast
from zipfile import ZipFile

import httpx2
import tornado
from async_lru import alru_cache
from packaging.specifiers import InvalidSpecifier, SpecifierSet
from packaging.utils import InvalidName, canonicalize_name
from packaging.version import InvalidVersion, Version
from packaging.version import parse as parse_version
from tornado.web import HTTPError
from traitlets import CFloat, CInt, Unicode, config

if sys.version_info >= (3, 12):
    from typing import override
else:
    from typing_extensions import override

from jupyterlab._version import __version__
from jupyterlab.extensions.manager import (
    ActionResult,
    ExtensionManager,
    ExtensionManagerMetadata,
    ExtensionPackage,
)

JSONValue = str | int | float | bool | None | list["JSONValue"] | dict[str, "JSONValue"]
PackageMetadata = dict[str, JSONValue]
FetchPackageMetadata = Callable[[str, str], Awaitable[PackageMetadata]]


def _json_object_or_none(value: object) -> dict[str, JSONValue] | None:
    if not isinstance(value, dict):
        return None
    return {key: cast("JSONValue", item) for key, item in value.items() if isinstance(key, str)}


def _json_object(value: object) -> dict[str, JSONValue]:
    return _json_object_or_none(value) or {}


def _json_list(value: object) -> list[JSONValue]:
    if not isinstance(value, list):
        return []
    return [cast("JSONValue", item) for item in value]


def _metadata_string(data: PackageMetadata, key: str) -> str | None:
    value = data.get(key)
    return value if isinstance(value, str) else None


def _metadata_string_map(data: PackageMetadata, key: str) -> dict[str, str]:
    value = data.get(key)
    if not isinstance(value, dict):
        return {}
    return {k: v for k, v in value.items() if isinstance(v, str)}


all_proxy_url = environ.get("ALL_PROXY")
# For historical reasons, we also support the lowercase environment variables.
# Info: https://about.gitlab.com/blog/2021/01/27/we-need-to-talk-no-proxy/
http_proxy_url = environ.get("http_proxy") or environ.get("HTTP_PROXY") or all_proxy_url
https_proxy_url = (
    environ.get("https_proxy") or environ.get("HTTPS_PROXY") or http_proxy_url or all_proxy_url
)

_httpx_mounts: dict[str, httpx2.AsyncBaseTransport] | None = None

if http_proxy_url:
    _httpx_mounts = {
        "http://": httpx2.AsyncHTTPTransport(proxy=http_proxy_url),
        "https://": httpx2.AsyncHTTPTransport(proxy=https_proxy_url),
    }


def _check_python_version_compatible(requires_python: str | None) -> tuple[bool, str | None]:
    """Check if the current Python version satisfies the requires_python specifier.

    Args:
        requires_python: The requires_python specifier string from PyPI (e.g., ">=3.10")

    Returns:
        (compatible, explanation)
        compatible: True if compatible or if requires_python is None/empty, False otherwise.
        explanation: A string explaining the mismatch if incompatible, otherwise None.
    """
    if not requires_python:
        return True, None
    try:
        current_version_str = sys.version.split()[0]
        current_version = Version(current_version_str)
        specifier = SpecifierSet(requires_python)
        if current_version in specifier:
            return True, None
        return False, f"Requires Python {requires_python} but detected Python {current_version}"
    except (InvalidSpecifier, InvalidVersion):
        # If parsing fails, assume compatible to avoid false negatives
        return True, None


def _process_output(output: bytes | str | None) -> str:
    """Decode captured subprocess output."""
    if output is None:
        return ""
    if isinstance(output, bytes):
        return output.decode("utf-8")
    return output


async def _fetch_package_metadata(
    client: httpx2.AsyncClient,
    name: str,
    base_url: str,
) -> PackageMetadata:
    response = await client.get(
        base_url + f"/{name}/json",
        headers={"Content-Type": "application/json"},
    )
    if response.status_code == HTTPStatus.NOT_FOUND:
        return {}
    if not response.is_success:
        response.raise_for_status()

    response_data: object = json.loads(response.text)
    data = _json_object(_json_object(response_data).get("info"))

    # Keep minimal information to limit cache size
    return {
        k: data.get(k)
        for k in [
            "author",
            "bugtrack_url",
            "docs_url",
            "home_page",
            "license",
            "package_url",
            "project_url",
            "project_urls",
            "requires_python",
            "summary",
            "version",
        ]
    }


# Known language packs from https://github.com/jupyterlab/language-packs
LANGUAGE_PACKS = (
    "jupyterlab-language-pack-ar-SA",
    "jupyterlab-language-pack-ca-ES",
    "jupyterlab-language-pack-cs-CZ",
    "jupyterlab-language-pack-da-DK",
    "jupyterlab-language-pack-de-DE",
    "jupyterlab-language-pack-el-GR",
    "jupyterlab-language-pack-es-ES",
    "jupyterlab-language-pack-et-EE",
    "jupyterlab-language-pack-fi-FI",
    "jupyterlab-language-pack-fr-FR",
    "jupyterlab-language-pack-he-IL",
    "jupyterlab-language-pack-hu-HU",
    "jupyterlab-language-pack-hy-AM",
    "jupyterlab-language-pack-id-ID",
    "jupyterlab-language-pack-it-IT",
    "jupyterlab-language-pack-ja-JP",
    "jupyterlab-language-pack-ko-KR",
    "jupyterlab-language-pack-lt-LT",
    "jupyterlab-language-pack-nl-NL",
    "jupyterlab-language-pack-no-NO",
    "jupyterlab-language-pack-pl-PL",
    "jupyterlab-language-pack-pt-BR",
    "jupyterlab-language-pack-ro-RO",
    "jupyterlab-language-pack-ru-RU",
    "jupyterlab-language-pack-tr-TR",
    "jupyterlab-language-pack-uk-UA",
    "jupyterlab-language-pack-vi-VN",
    "jupyterlab-language-pack-zh-CN",
    "jupyterlab-language-pack-zh-TW",
)


class PyPIExtensionManager(ExtensionManager):
    """Extension manager using pip as package manager and PyPi.org as packages source."""

    base_url = Unicode("https://pypi.org/pypi", config=True, help="The base URL of PyPI index.")

    cache_timeout = CFloat(
        5 * 60.0, config=True, help="PyPI language pack metadata cache timeout in seconds."
    )

    package_metadata_cache_size = CInt(
        1500, config=True, help="The cache size for package metadata."
    )

    def __init__(
        self,
        app_options: dict | None = None,
        ext_options: dict | None = None,
        parent: config.Configurable | None = None,
    ) -> None:
        super().__init__(app_options, ext_options, parent)
        self._httpx_client = httpx2.AsyncClient(mounts=_httpx_mounts)
        self._configure_package_metadata_cache()
        self.observe(
            self._configure_package_metadata_cache, ["cache_timeout", "package_metadata_cache_size"]
        )

    @property
    def metadata(self) -> ExtensionManagerMetadata:
        """Extension manager metadata."""
        return ExtensionManagerMetadata("PyPI", True, sys.prefix)

    @override
    async def is_install_allowed(self, name: str, version: str | None = None) -> bool:
        if not self._is_valid_package_name(name):
            return False

        try:
            if version is not None:
                parse_version(version)
        except InvalidVersion:
            self.log.warning(f"Version {version!r} does not comply with PEP 440")
            return False

        allowed = await self._is_allowed_by_listing(name)
        if not allowed:
            self.log.warning(f"Installation denied by allowlist/blocklist for {name}")
        return allowed

    @override
    async def is_uninstall_allowed(self, name: str) -> bool:
        return self._is_valid_package_name(name)

    def _is_valid_package_name(self, name: str) -> bool:
        try:
            canonicalize_name(name, validate=True)
        except InvalidName:
            self.log.warning(f"Invalid extension name: {name!r}")
            return False
        return True

    @override
    def _canonicalize_name(self, name: str) -> str:
        """Canonicalize PyPI package names for listing policy comparisons."""
        return canonicalize_name(name)

    async def get_latest_version(self, pkg: str) -> str | None:
        """Return the latest available version for a given extension.

        Args:
            pkg: The extension to search for
        Returns:
            The latest available version
        """
        try:
            response = await self._httpx_client.get(
                self.base_url + f"/{pkg}/json", headers={"Content-Type": "application/json"}
            )

            if response.status_code < 400:  # noqa PLR2004
                response_data: object = json.loads(response.content)
                data = _json_object(_json_object(response_data).get("info"))
            else:
                self.log.debug(f"Failed to get package information on PyPI; {response!s}")
                return None
        except Exception:
            return None
        else:
            return (
                ExtensionManager.get_semver_version(_metadata_string(data, "version") or "") or None
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
        if extension.install is not None:
            install_metadata = extension.install
            if install_metadata["packageManager"] == "python":
                return self._normalize_name(install_metadata["packageName"])
        return self._normalize_name(extension.name)

    def _configure_package_metadata_cache(self, _change: object = None) -> None:
        self._fetch_package_metadata = cast(
            "FetchPackageMetadata",
            alru_cache(maxsize=self.package_metadata_cache_size)(
                partial(_fetch_package_metadata, self._httpx_client)
            ),
        )
        self._package_metadata_cache_expires = monotonic() + self.cache_timeout

    @override
    async def _get_extensions_page(
        self, query: str | None, page: int, per_page: int
    ) -> tuple[dict[str, ExtensionPackage], int]:
        if query is None:
            return await super()._get_extensions_page(query, page, per_page)
        # Cache metadata per pack so a partial search can recover on the next request.
        extensions, last_page = await self.list_packages(query, page, per_page)
        return extensions, last_page or 1

    @override
    async def refresh(self, query: str | None, page: int, per_page: int) -> None:
        """Refresh installed extensions or invalidate cached language pack metadata."""
        if query is None:
            await super().refresh(query, page, per_page)
        else:
            self._configure_package_metadata_cache()

    async def list_packages(
        self, query: str, page: int, per_page: int
    ) -> tuple[dict[str, ExtensionPackage], int | None]:
        """List known language packs matching the query."""
        if monotonic() >= self._package_metadata_cache_expires:
            self._configure_package_metadata_cache()

        query = query.casefold()
        names = sorted(name for name in LANGUAGE_PACKS if query in name.casefold())
        packages = await asyncio.gather(
            *(self._fetch_package_metadata(name, self.base_url) for name in names),
            return_exceptions=True,
        )

        matches = []
        failed = False
        for name, data in zip(names, packages, strict=True):
            if isinstance(data, BaseException):
                if not isinstance(data, Exception):
                    raise data
                self.log.debug("Failed to fetch language pack metadata for %s: %s", name, data)
                failed = True
                continue
            latest_version = _metadata_string(data, "version")
            if not latest_version:
                continue

            package_urls = _metadata_string_map(data, "project_urls")

            source_url = package_urls.get("Source Code")
            homepage_url = _metadata_string(data, "home_page") or package_urls.get("Homepage")
            documentation_url = _metadata_string(data, "docs_url") or package_urls.get(
                "Documentation"
            )
            bug_tracker_url = _metadata_string(data, "bugtrack_url") or package_urls.get(
                "Bug Tracker"
            )

            best_guess_home_url = (
                homepage_url
                or _metadata_string(data, "project_url")
                or _metadata_string(data, "package_url")
                or documentation_url
                or source_url
                or bug_tracker_url
            )

            # Check Python version compatibility
            requires_python = _metadata_string(data, "requires_python")
            python_compatible, version_explanation = _check_python_version_compatible(
                requires_python
            )

            description = _metadata_string(data, "summary") or ""
            if version_explanation:
                if description:
                    description += f" ({version_explanation})"
                else:
                    description = version_explanation

            extension = ExtensionPackage(
                name=self._normalize_name(name),
                description=description,
                homepage_url=best_guess_home_url or "",
                author=_metadata_string(data, "author"),
                license=_metadata_string(data, "license"),
                latest_version=ExtensionManager.get_semver_version(latest_version),
                pkg_type="prebuilt",
                allowed=python_compatible,
                bug_tracker_url=bug_tracker_url,
                documentation_url=documentation_url,
                package_manager_url=_metadata_string(data, "package_url"),
                repository_url=source_url,
            )

            matches.append(extension)

        if failed and not matches:
            raise HTTPError(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "Could not load language packs from PyPI. Try refreshing the extensions list.",
            )

        start = (page - 1) * per_page
        extensions = {pack.name: pack for pack in matches[start : start + per_page]}
        return extensions, math.ceil(len(matches) / per_page)

    async def install(self, name: str, version: str | None = None) -> ActionResult:  # noqa
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
        if not await self.is_install_allowed(name, version):
            # is_install_allowed will log the reason
            return ActionResult(status="error", message="install is not allowed")

        current_loop = tornado.ioloop.IOLoop.current()
        with (
            tempfile.TemporaryDirectory() as ve_dir,
            tempfile.NamedTemporaryFile(mode="w+", dir=ve_dir, delete=False) as fconstraint,
        ):
            fconstraint.write(f"jupyterlab=={__version__}")
            fconstraint.flush()

            cmdline = [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--no-input",
                "--quiet",
                "--progress-bar",
                "off",
                "--constraint",
                fconstraint.name,
            ]
            if version is not None:
                cmdline.append(f"{name}=={version}")
            else:
                cmdline.append(name)

            pkg_action: dict[str, JSONValue] = {}
            try:
                tmp_cmd = cmdline.copy()
                tmp_cmd.insert(-1, "--dry-run")
                tmp_cmd.insert(-1, "--report")
                tmp_cmd.insert(-1, "-")
                result = await current_loop.run_in_executor(
                    None, partial(run, tmp_cmd, capture_output=True, check=True)
                )

                action_info = _json_object(json.loads(_process_output(result.stdout)))
                expected_name = name.replace("_", "-")
                for package in _json_list(action_info.get("install")):
                    if not isinstance(package, dict):
                        continue
                    metadata = _json_object(package.get("metadata"))
                    if metadata.get("name") == expected_name:
                        pkg_action = package
                        break
            except CalledProcessError as e:
                self.log.debug(
                    f"Fail to get installation report: {_process_output(e.stderr)}",
                    exc_info=e,
                )
            except Exception as err:
                self.log.debug("Fail to get installation report.", exc_info=err)
            else:
                self.log.debug(f"Actions to be executed by pip {json.dumps(action_info)}.")

            self.log.debug(f"Executing '{' '.join(cmdline)}'")

            result = await current_loop.run_in_executor(
                None, partial(run, cmdline, capture_output=True)
            )

            self.log.debug(f"return code: {result.returncode}")
            self.log.debug(f"stdout: {_process_output(result.stdout)}")
            error = _process_output(result.stderr)
            if result.returncode == 0:
                self.log.debug(f"stderr: {error}")
                # Figure out if the package has server or kernel parts
                jlab_metadata: dict[str, JSONValue] | None = None
                try:
                    raw_download_info = pkg_action.get("download_info")
                    download_info = _json_object(raw_download_info)
                    download_url = _metadata_string(download_info, "url")
                    if download_url is not None:
                        response = await self._httpx_client.get(download_url)
                        if response.status_code < 400:  # noqa PLR2004
                            if download_url.endswith(".whl"):
                                with ZipFile(io.BytesIO(response.content)) as wheel:
                                    for filename in filter(
                                        lambda f: Path(f).name == "package.json",
                                        wheel.namelist(),
                                    ):
                                        data = _json_object(json.loads(wheel.read(filename)))
                                        jlab_metadata = _json_object_or_none(data.get("jupyterlab"))
                                        if jlab_metadata is not None:
                                            break
                            elif download_url.endswith("tar.gz"):
                                with TarFile.open(
                                    fileobj=io.BytesIO(response.content), mode="r:gz"
                                ) as sdist:
                                    for filename in filter(
                                        lambda f: Path(f).name == "package.json",
                                        sdist.getnames(),
                                    ):
                                        package_file = sdist.extractfile(sdist.getmember(filename))
                                        if package_file is None:
                                            continue
                                        data = _json_object(json.load(package_file))
                                        jlab_metadata = _json_object_or_none(data.get("jupyterlab"))
                                        if jlab_metadata is not None:
                                            break
                        else:
                            self.log.debug(f"Failed to get '{download_url}'; {response!s}")
                except Exception as e:
                    self.log.debug("Fail to get package.json.", exc_info=e)

                follow_ups = [
                    "frontend",
                ]
                if jlab_metadata is not None:
                    discovery = _json_object(jlab_metadata.get("discovery"))
                    if "kernel" in discovery:
                        follow_ups.append("kernel")
                    if "server" in discovery:
                        follow_ups.append("server")

                return ActionResult(status="ok", needs_restart=follow_ups)
            else:
                self.log.error(f"Failed to install {name}: code {result.returncode}\n{error}")
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
        if not await self.is_uninstall_allowed(extension):
            return ActionResult(status="error", message="uninstall is not allowed")

        current_loop = tornado.ioloop.IOLoop.current()
        cmdline = [
            sys.executable,
            "-m",
            "pip",
            "uninstall",
            "--yes",
            "--no-input",
            "--",
            extension,
        ]

        # Figure out if the package has server or kernel parts
        jlab_metadata: dict[str, JSONValue] | None = None
        try:
            tmp_cmd = cmdline.copy()
            tmp_cmd.remove("--yes")
            result = await current_loop.run_in_executor(
                None, partial(run, tmp_cmd, capture_output=True)
            )
            lines = [
                line.strip()
                for line in _process_output(result.stdout).splitlines()
                if line.strip().endswith("package.json")
            ]
            for filepath in (Path(line) for line in lines):
                data = _json_object(json.loads(filepath.read_bytes()))
                jlab_metadata = _json_object_or_none(data.get("jupyterlab"))
                if jlab_metadata is not None:
                    break
        except Exception as e:
            self.log.debug("Fail to list files to be uninstalled.", exc_info=e)

        self.log.debug(f"Executing '{' '.join(cmdline)}'")

        result = await current_loop.run_in_executor(
            None, partial(run, cmdline, capture_output=True)
        )

        self.log.debug(f"return code: {result.returncode}")
        self.log.debug(f"stdout: {_process_output(result.stdout)}")
        error = _process_output(result.stderr)
        if result.returncode == 0:
            self.log.debug(f"stderr: {error}")
            follow_ups = [
                "frontend",
            ]
            if jlab_metadata is not None:
                discovery = _json_object(jlab_metadata.get("discovery"))
                if "kernel" in discovery:
                    follow_ups.append("kernel")
                if "server" in discovery:
                    follow_ups.append("server")

            return ActionResult(status="ok", needs_restart=follow_ups)
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
