"""Extensions manager for JupyterLab."""

import sys
from typing import Optional

from traitlets.config import Configurable

from .manager import ActionResult, ExtensionPackage, ExtensionsManager  # noqa: F401
from .pypi import PyPiExtensionsManager
from .readonly import ReadOnlyExtensionsManager

# See compatibility note on `group` keyword in https://docs.python.org/3/library/importlib.metadata.html#entry-points
if sys.version_info < (3, 10):
    from importlib_metadata import entry_points
else:
    from importlib.metadata import entry_points

# Supported third-party services
MANAGERS = {}

for entry in entry_points(group="jupyterlab.extension_manager_v1"):
    MANAGERS[entry.name] = entry


# Entry points


def get_readonly_manager(
    app_options: Optional[dict] = None,
    ext_options: Optional[dict] = None,
    parent: Optional[Configurable] = None,
) -> ExtensionsManager:
    """Read-Only Extensions Manager factory"""
    return ReadOnlyExtensionsManager(app_options, ext_options, parent)


def get_pypi_manager(
    app_options: Optional[dict] = None,
    ext_options: Optional[dict] = None,
    parent: Optional[Configurable] = None,
) -> ExtensionsManager:
    """PyPi Extensions Manager factory"""
    return PyPiExtensionsManager(app_options, ext_options, parent)
