# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os
import os.path as osp
from itertools import filterfalse
from typing import TypedDict, overload

HERE = os.path.dirname(os.path.abspath(__file__))


def pjoin(*args: str | os.PathLike[str]) -> str:
    """Join paths to create a real path."""
    return osp.abspath(osp.join(*args))


class JupyterLabCoreData(TypedDict):
    name: str
    version: str
    extensions: dict[str, str]
    mimeExtensions: dict[str, str]
    buildDir: str
    outputDir: str
    singletonPackages: list[str]
    linkedPackages: dict[str, str]
    staticDir: str


class CoreData(TypedDict):
    name: str
    version: str
    private: bool
    license: str
    scripts: dict[str, str]
    resolutions: dict[str, str]
    dependencies: dict[str, str]
    devDependencies: dict[str, str]
    engines: dict[str, str]
    jupyterlab: JupyterLabCoreData


def _get_default_core_data() -> CoreData:
    """Get the data for the app template."""
    with open(pjoin(HERE, "staging", "package.json")) as fid:
        data: CoreData = json.load(fid)
        return data


def _is_lab_package(name: str) -> bool:
    """Whether a package name is in the lab namespace"""
    return name.startswith("@jupyterlab/")


@overload
def _only_nonlab(collection: dict[str, str]) -> dict[str, str]:
    pass


@overload
def _only_nonlab(collection: list[str] | tuple[str, ...]) -> list[str]:
    pass


def _only_nonlab(
    collection: dict[str, str] | list[str] | tuple[str, ...],
) -> dict[str, str] | list[str]:
    """Filter a dict/sequence to remove all lab packages

    This is useful to take the default values of e.g. singletons and filter
    away the '@jupyterlab/' namespace packages, but leave any others (e.g.
    lumino and react).
    """
    if isinstance(collection, dict):
        return {k: v for (k, v) in collection.items() if not _is_lab_package(k)}
    elif isinstance(collection, (list, tuple)):
        return list(filterfalse(_is_lab_package, collection))
    msg = "collection arg should be either dict or list/tuple"
    raise TypeError(msg)


class CoreConfig:
    """An object representing a core config.

    This enables custom lab application to override some parts of the core
    configuration of the build system.
    """

    def __init__(self):
        self._data = _get_default_core_data()

    def add(self, name: str, semver: str, extension: bool = False, mime_extension: bool = False):
        """Remove an extension/singleton.

        If neither extension or mimeExtension is True (the default)
        the package is added as a singleton dependency.

        name: string
            The npm package name
        semver: string
            The semver range for the package
        extension: bool
            Whether the package is an extension
        mime_extension: bool
            Whether the package is a MIME extension
        """
        data = self._data
        if not name:
            msg = "Missing package name"
            raise ValueError(msg)
        if not semver:
            msg = "Missing package semver"
            raise ValueError(msg)
        if name in data["resolutions"]:
            msg = f"Package already present: {name!r}"
            raise ValueError(msg)
        data["resolutions"][name] = semver

        # If both mimeExtension and extensions are True, treat
        # as mime extension
        if mime_extension:
            data["jupyterlab"]["mimeExtensions"][name] = ""
            data["dependencies"][name] = semver
        elif extension:
            data["jupyterlab"]["extensions"][name] = ""
            data["dependencies"][name] = semver
        else:
            data["jupyterlab"]["singletonPackages"].append(name)

    def remove(self, name: str):
        """Remove a package/extension.

        name: string
            The npm package name
        """
        data = self._data
        maps = (
            data["dependencies"],
            data["resolutions"],
            data["jupyterlab"]["extensions"],
            data["jupyterlab"]["mimeExtensions"],
        )
        for m in maps:
            m.pop(name, None)

        data["jupyterlab"]["singletonPackages"].remove(name)

    def clear_packages(self, lab_only: bool = True):
        """Clear the packages/extensions."""
        data = self._data
        # Clear all dependencies
        if lab_only:
            # Clear all "@jupyterlab/" dependencies
            data["dependencies"] = _only_nonlab(data["dependencies"])
            data["resolutions"] = _only_nonlab(data["resolutions"])
            data["jupyterlab"]["extensions"] = _only_nonlab(data["jupyterlab"]["extensions"])
            data["jupyterlab"]["mimeExtensions"] = _only_nonlab(
                data["jupyterlab"]["mimeExtensions"]
            )
            data["jupyterlab"]["singletonPackages"] = _only_nonlab(
                data["jupyterlab"]["singletonPackages"]
            )
        else:
            data["dependencies"] = {}
            data["resolutions"] = {}
            data["jupyterlab"]["extensions"] = {}
            data["jupyterlab"]["mimeExtensions"] = {}
            data["jupyterlab"]["singletonPackages"] = []

    @property
    def extensions(self) -> dict[str, str]:
        """A dict mapping all extension names to their semver"""
        data = self._data
        return {k: data["resolutions"][k] for k in data["jupyterlab"]["extensions"]}

    @property
    def mime_extensions(self) -> dict[str, str]:
        """A dict mapping all MIME extension names to their semver"""
        data = self._data
        return {k: data["resolutions"][k] for k in data["jupyterlab"]["mimeExtensions"]}

    @property
    def singletons(self) -> dict[str, str | None]:
        """A dict mapping all singleton names to their semver"""
        data = self._data
        return {
            k: data["resolutions"].get(k, None) for k in data["jupyterlab"]["singletonPackages"]
        }

    @property
    def static_dir(self) -> str:
        return self._data["jupyterlab"]["staticDir"]

    @static_dir.setter
    def static_dir(self, static_dir: str):
        self._data["jupyterlab"]["staticDir"] = static_dir
