# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from _pytest.config import Config
    from _pytest.config.argparsing import Parser
    from _pytest.nodes import Item

pytest_plugins = [
    "pytest_jupyter.jupyter_server",
    "jupyterlab_server.pytest_plugin",
    "jupyterlab.pytest_plugin",
]


def pytest_addoption(parser: Parser) -> None:
    """
    Adds flags for pytest.

    This is called by the pytest API
    """
    group = parser.getgroup("general")
    group.addoption("--quick", action="store_true", help="Skip slow tests")
    group.addoption("--slow", action="store_true", help="Run only slow tests")


def pytest_configure(config: Config) -> None:
    config.addinivalue_line("markers", "slow: mark test as slow to run")


def pytest_collection_modifyitems(config: Config, items: list[Item]) -> None:
    if config.getoption("--quick"):
        skip_slow = pytest.mark.skip(reason="skipping slow test")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)
    elif config.getoption("--slow"):
        skip_quick = pytest.mark.skip(reason="skipping non-slow test")
        for item in items:
            if "slow" not in item.keywords:
                item.add_marker(skip_quick)
