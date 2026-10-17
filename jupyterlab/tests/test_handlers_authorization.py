# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Test that the lab API handlers consult the server authorizer."""

import json
from types import SimpleNamespace
from typing import ClassVar
from unittest.mock import AsyncMock

import pytest
from jupyter_server.auth.authorizer import Authorizer
from tornado.httpclient import HTTPClientError

from jupyterlab.extensions.manager import ActionResult
from jupyterlab.handlers.build_handler import BuildHandler, build_path
from jupyterlab.handlers.extension_manager_handler import (
    ExtensionHandler,
    extensions_handler_path,
)
from jupyterlab.handlers.plugin_manager_handler import PluginHandler, plugins_handler_path


class RecordingAuthorizer(Authorizer):
    """Records the authorization requests and denies the actions in `denied`."""

    denied: ClassVar[set[str]] = set()
    requests: ClassVar[list[tuple[str, str]]] = []

    def is_authorized(self, handler, user, action, resource):
        RecordingAuthorizer.requests.append((action, resource))
        return action not in RecordingAuthorizer.denied


@pytest.fixture
def jp_server_config():
    return {"ServerApp": {"authorizer_class": RecordingAuthorizer}}


@pytest.fixture
def managers():
    result = ActionResult(status="ok")
    return SimpleNamespace(
        extensions=SimpleNamespace(
            list_extensions=AsyncMock(return_value=([], None)),
            refresh=AsyncMock(),
            is_install_allowed=AsyncMock(return_value=True),
            is_uninstall_allowed=AsyncMock(return_value=True),
            install=AsyncMock(return_value=result),
            uninstall=AsyncMock(return_value=result),
            enable=AsyncMock(return_value=result),
            disable=AsyncMock(return_value=result),
        ),
        plugins=SimpleNamespace(
            plugin_locks=AsyncMock(return_value={}),
            enable=AsyncMock(return_value=result),
            disable=AsyncMock(return_value=result),
        ),
        builder=SimpleNamespace(
            get_status=AsyncMock(return_value={"status": "stable", "message": ""}),
            build=AsyncMock(),
            cancel=AsyncMock(),
            canceled=False,
        ),
    )


@pytest.fixture
def labapp(jp_serverapp, make_labserver_extension_app, managers):
    app = make_labserver_extension_app()
    app._link_jupyter_server_extension(jp_serverapp)
    app.handlers.extend(
        [
            (extensions_handler_path, ExtensionHandler, {"manager": managers.extensions}),
            (plugins_handler_path, PluginHandler, {"manager": managers.plugins}),
            (build_path, BuildHandler, {"name": app.name, "builder": managers.builder}),
        ]
    )
    app.initialize()
    RecordingAuthorizer.requests = []
    RecordingAuthorizer.denied = set()
    yield app
    RecordingAuthorizer.denied = set()


def extension(cmd):
    return {"cmd": cmd, "extension_name": "my-extension"}


def plugin(cmd):
    return {"cmd": cmd, "plugin_name": "my-extension:plugin"}


EXTENSIONS = "jupyterlab:extensions"
PLUGINS = "jupyterlab:plugins"
BUILD = "jupyterlab:build"

# Method, path, body, and the actions checked on the resource
REQUESTS = [
    ("GET", extensions_handler_path, None, {"read"}, EXTENSIONS),
    ("POST", extensions_handler_path, extension("install"), {"write", "execute"}, EXTENSIONS),
    ("POST", extensions_handler_path, extension("uninstall"), {"write"}, EXTENSIONS),
    ("POST", extensions_handler_path, extension("enable"), {"write"}, EXTENSIONS),
    ("POST", extensions_handler_path, extension("disable"), {"write"}, EXTENSIONS),
    ("GET", plugins_handler_path, None, {"read"}, PLUGINS),
    ("POST", plugins_handler_path, plugin("enable"), {"write"}, PLUGINS),
    ("POST", plugins_handler_path, plugin("disable"), {"write"}, PLUGINS),
    ("GET", build_path, None, {"read"}, BUILD),
    ("POST", build_path, {}, {"write"}, BUILD),
    ("DELETE", build_path, None, {"write"}, BUILD),
]


def fetch(jp_fetch, method, path, body):
    return jp_fetch(
        *path.strip("/").split("/"),
        method=method,
        body=None if body is None else json.dumps(body),
    )


def calls(managers):
    """Count the calls made to the managers."""
    return sum(
        method.await_count
        for manager in vars(managers).values()
        for method in vars(manager).values()
        if isinstance(method, AsyncMock)
    )


@pytest.mark.parametrize("method, path, body, actions, resource", REQUESTS)
async def test_allowed_requests_are_authorized(
    labapp, jp_fetch, managers, method, path, body, actions, resource
):
    response = await fetch(jp_fetch, method, path, body)
    assert response.code in (200, 201, 204)
    assert set(RecordingAuthorizer.requests) == {(action, resource) for action in actions}
    assert calls(managers) > 0


@pytest.mark.parametrize("denied", ["read", "write", "execute"])
@pytest.mark.parametrize("method, path, body, actions, resource", REQUESTS)
async def test_denied_requests_do_nothing(
    labapp, jp_fetch, managers, denied, method, path, body, actions, resource
):
    RecordingAuthorizer.denied = {denied}
    if denied not in actions:
        response = await fetch(jp_fetch, method, path, body)
        assert response.code in (200, 201, 204)
        return
    with pytest.raises(HTTPClientError) as e:
        await fetch(jp_fetch, method, path, body)
    assert e.value.code == 403
    assert (denied, resource) in RecordingAuthorizer.requests
    assert calls(managers) == 0
