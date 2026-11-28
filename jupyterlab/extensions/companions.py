"""Companion package discovery and compatibility checking."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import os
import re
import shutil
import sys
from importlib.metadata import Distribution, PackageNotFoundError, distribution
from pathlib import Path
from typing import Any

from jupyter_client.kernelspec import KernelSpecManager
from packaging.specifiers import InvalidSpecifier, SpecifierSet
from packaging.version import InvalidVersion, Version


def get_all_kernelspecs() -> dict[str, dict[str, Any]]:
    """Return available kernelspecs keyed by kernelspec name."""
    try:
        return KernelSpecManager().get_all_specs()
    except Exception:
        return {}


def _parse_package_entry(raw: object) -> dict[str, str] | None:
    if not isinstance(raw, dict):
        return None
    name = raw.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    entry: dict[str, str] = {"name": name.strip()}
    version = raw.get("version")
    if isinstance(version, str) and version.strip():
        entry["version"] = version.strip()
    return entry


def _parse_overrides(raw: object) -> dict[str, dict[str, str]]:
    if not isinstance(raw, dict):
        return {}
    parsed: dict[str, dict[str, str]] = {}
    for manager, value in raw.items():
        if not isinstance(manager, str):
            continue
        entry = _parse_package_entry(value)
        if entry is not None:
            parsed[manager] = entry
    return parsed


def _parse_managers(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, str) and item.strip()]


def _parse_kernel_spec_filter(raw: object) -> dict[str, str]:
    if not isinstance(raw, dict):
        return {}
    result: dict[str, str] = {}
    for key in ("language", "display_name"):
        value = raw.get(key)
        if isinstance(value, str) and value:
            result[key] = value
    return result


def _candidate_names(base: dict[str, str], overrides: dict[str, dict[str, str]]) -> list[str]:
    names: list[str] = []
    pip_override = overrides.get("pip")
    if pip_override is not None:
        names.append(pip_override["name"])
    if base["name"] not in names:
        names.append(base["name"])
    return names


def _required_version(base: dict[str, str], overrides: dict[str, dict[str, str]]) -> str | None:
    pip_override = overrides.get("pip")
    if pip_override is not None and "version" in pip_override:
        return pip_override["version"]
    return base.get("version")


def _find_installed_version(
    package_names: list[str], search_paths: list[str] | None = None
) -> str | None:
    for name in package_names:
        try:
            if search_paths is None:
                return distribution(name).version
            dist = next(iter(Distribution.discover(name=name, path=search_paths)), None)
            if dist is not None:
                return dist.version
        except (PackageNotFoundError, OSError, ValueError):
            continue
    return None


def _check_version(installed_version: str | None, required_version: str | None) -> dict[str, Any]:
    if installed_version is None:
        return {
            "status": "missing",
            "installedVersion": None,
            "requiredVersion": required_version,
            "message": None,
        }

    if not required_version:
        return {
            "status": "ok",
            "installedVersion": installed_version,
            "requiredVersion": None,
            "message": None,
        }

    try:
        specifiers = SpecifierSet(required_version)
    except InvalidSpecifier:
        return {
            "status": "unknown",
            "installedVersion": installed_version,
            "requiredVersion": required_version,
            "message": f"Invalid version specifier: {required_version}",
        }

    try:
        parsed_version = Version(installed_version)
    except InvalidVersion:
        return {
            "status": "unknown",
            "installedVersion": installed_version,
            "requiredVersion": required_version,
            "message": f"Invalid installed version: {installed_version}",
        }

    if specifiers.contains(parsed_version, prereleases=True):
        return {
            "status": "ok",
            "installedVersion": installed_version,
            "requiredVersion": required_version,
            "message": None,
        }

    return {
        "status": "incompatible",
        "installedVersion": installed_version,
        "requiredVersion": required_version,
        "message": f"Installed version {installed_version} does not satisfy {required_version}",
    }


def _resolve_python_site_packages(spec: dict[str, Any]) -> tuple[bool, list[str] | None]:
    """Determine whether a kernelspec's Python environment can be inspected on disk."""
    argv = spec.get("argv")
    if not isinstance(argv, list) or not argv or not isinstance(argv[0], str):
        return False, None

    executable = argv[0]
    exe_name = Path(executable).name.lower()
    if not exe_name.startswith("python"):
        return False, None

    exe_path = Path(executable)
    if not exe_path.is_absolute():
        which_path = shutil.which(executable)
        if which_path is None:
            return False, None
        exe_path = Path(which_path)

    if os.path.normcase(os.path.abspath(exe_path)) == os.path.normcase(
        os.path.abspath(sys.executable)
    ):
        return True, None

    site_packages: list[Path] = []
    for root in (exe_path.parent.parent, exe_path.parent):
        win_site = root / "Lib" / "site-packages"
        if win_site.is_dir():
            site_packages.append(win_site)
        posix_lib = root / "lib"
        if posix_lib.is_dir():
            site_packages.extend(sorted(posix_lib.glob("python*/site-packages")))

    if not site_packages:
        return False, None

    unique_paths = list(dict.fromkeys(str(p) for p in site_packages if p.is_dir()))
    return (True, unique_paths) if unique_paths else (False, None)


def _matches_pattern(pattern: str | None, value: object) -> bool:
    if not pattern:
        return True
    if not isinstance(value, str):
        return False
    try:
        return bool(re.search(pattern, value))
    except re.error:
        return False


def _matches_kernelspec(kernel_spec_filter: dict[str, str], spec: dict[str, Any]) -> bool:
    return _matches_pattern(kernel_spec_filter.get("language"), spec.get("language")) and (
        _matches_pattern(kernel_spec_filter.get("display_name"), spec.get("display_name"))
    )


def _inspect_server_companion(raw_server: object) -> tuple[dict[str, Any] | None, bool]:
    if not isinstance(raw_server, dict):
        return None, False
    base = _parse_package_entry(raw_server.get("base"))
    if base is None:
        return None, False
    overrides = _parse_overrides(raw_server.get("overrides"))
    managers = _parse_managers(raw_server.get("managers"))
    required = _required_version(base, overrides)
    installed = _find_installed_version(_candidate_names(base, overrides))
    check = _check_version(installed, required)
    has_issue = check["status"] in ("missing", "incompatible")
    server_entry: dict[str, Any] = {
        "base": base,
        "managers": managers,
        "check": check,
    }
    if overrides:
        server_entry["overrides"] = overrides
    return server_entry, has_issue


def _inspect_kernel_entry(
    raw_kernel: dict[str, Any], specs: dict[str, dict[str, Any]]
) -> tuple[dict[str, Any] | None, bool]:
    base = _parse_package_entry(raw_kernel.get("base"))
    if base is None:
        return None, False
    kernel_spec_filter = _parse_kernel_spec_filter(raw_kernel.get("kernel_spec"))
    overrides = _parse_overrides(raw_kernel.get("overrides"))
    managers = _parse_managers(raw_kernel.get("managers"))
    required = _required_version(base, overrides)
    names = _candidate_names(base, overrides)

    checks: list[dict[str, Any]] = []
    has_issue = False
    for ks_name, ks_info in specs.items():
        spec = ks_info.get("spec", {}) if isinstance(ks_info, dict) else {}
        if not isinstance(spec, dict) or not _matches_kernelspec(kernel_spec_filter, spec):
            continue
        can_inspect, search_paths = _resolve_python_site_packages(spec)
        if can_inspect:
            installed = _find_installed_version(names, search_paths=search_paths)
            check = _check_version(installed, required)
            if check["status"] in ("missing", "incompatible"):
                has_issue = True
        else:
            check = {
                "status": "unknown",
                "installedVersion": None,
                "requiredVersion": required,
                "message": None,
            }
        checks.append(
            {
                "kernelName": ks_name,
                "displayName": spec.get("display_name") or ks_name,
                "language": spec.get("language") or "",
                **check,
            }
        )

    kernel_entry: dict[str, Any] = {
        "kernel_spec": kernel_spec_filter,
        "base": base,
        "managers": managers,
        "checks": checks,
    }
    if overrides:
        kernel_entry["overrides"] = overrides
    return kernel_entry, has_issue


def _inspect_kernel_companions(
    raw_kernels: object, kernelspecs: dict[str, dict[str, Any]] | None
) -> tuple[list[dict[str, Any]], bool]:
    if not isinstance(raw_kernels, list):
        return [], False
    specs = kernelspecs or {}
    entries: list[dict[str, Any]] = []
    has_issue = False
    for raw_kernel in raw_kernels:
        if not isinstance(raw_kernel, dict):
            continue
        entry, entry_issue = _inspect_kernel_entry(raw_kernel, specs)
        if entry is not None:
            entries.append(entry)
            has_issue = has_issue or entry_issue
    return entries, has_issue


def inspect_companions(
    data: dict[str, Any],
    kernelspecs: dict[str, dict[str, Any]] | None = None,
) -> tuple[dict[str, Any] | None, bool]:
    """Parse ``jupyterlab.discovery`` metadata and check companion compatibility.

    Args:
        data: Extension ``package.json`` metadata dictionary.
        kernelspecs: Mapping of kernelspec names to kernelspec info dictionaries.

    Returns:
        A tuple of ``(companions_metadata, has_issue)``.
    """
    jlab_meta = data.get("jupyterlab")
    if not isinstance(jlab_meta, dict):
        return None, False

    discovery = jlab_meta.get("discovery")
    if not isinstance(discovery, dict):
        return None, False

    result: dict[str, Any] = {}
    server_entry, server_issue = _inspect_server_companion(discovery.get("server"))
    if server_entry is not None:
        result["server"] = server_entry

    kernel_entries, kernel_issue = _inspect_kernel_companions(discovery.get("kernel"), kernelspecs)
    if kernel_entries:
        result["kernel"] = kernel_entries

    if not result:
        return None, False

    return result, (server_issue or kernel_issue)
