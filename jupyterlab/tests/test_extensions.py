import json
from typing import NamedTuple
from unittest.mock import patch

from jupyterlab.extensions import ReadOnlyExtensionsManager
from jupyterlab.extensions.manager import ExtensionPackage


async def test_ExtensionsManager_list_extensions_installed(monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")

    async def mock_installed(*args, **kwargs):
        return {"extension1": extension1}

    monkeypatch.setattr(ReadOnlyExtensionsManager, "_get_installed_extensions", mock_installed)

    manager = ReadOnlyExtensionsManager()

    extensions = await manager.list_extensions()

    assert extensions == {extension1}


async def test_ExtensionsManager_list_extensions_query(monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")
    extension2 = ExtensionPackage("extension2", "Extension 2 description", "", "prebuilt")

    async def mock_list(*args, **kwargs):
        return {"extension1": extension1, "extension2": extension2}, None

    monkeypatch.setattr(ReadOnlyExtensionsManager, "list_packages", mock_list)

    manager = ReadOnlyExtensionsManager()

    extensions = await manager.list_extensions("ext")

    assert extensions == {extension1, extension2}


@patch("jupyterlab.extensions.manager.requests")
async def test_ExtensionsManager_list_extensions_query_allow(mock_requests, monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")
    extension2 = ExtensionPackage("extension2", "Extension 2 description", "", "prebuilt")

    class Request(NamedTuple):
        text: str

    mock_requests.request.return_value = Request(
        json.dumps({"allowed_extensions": [{"name": "extension1"}]})
    )

    async def mock_list(*args, **kwargs):
        return {"extension1": extension1, "extension2": extension2}, None

    monkeypatch.setattr(ReadOnlyExtensionsManager, "list_packages", mock_list)

    manager = ReadOnlyExtensionsManager(
        ext_options=dict(allowed_extensions_uris={"http://dummy-allowed-extension"})
    )

    extensions = await manager.list_extensions("ext")

    assert extensions == {extension1}


@patch("jupyterlab.extensions.manager.requests")
async def test_ExtensionsManager_list_extensions_query_block(mock_requests, monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")
    extension2 = ExtensionPackage("extension2", "Extension 2 description", "", "prebuilt")

    class Request(NamedTuple):
        text: str

    mock_requests.request.return_value = Request(
        json.dumps({"blocked_extensions": [{"name": "extension1"}]})
    )

    async def mock_list(*args, **kwargs):
        return {"extension1": extension1, "extension2": extension2}, None

    monkeypatch.setattr(ReadOnlyExtensionsManager, "list_packages", mock_list)

    manager = ReadOnlyExtensionsManager(
        ext_options=dict(blocked_extensions_uris={"http://dummy-blocked-extension"})
    )

    extensions = await manager.list_extensions("ext")

    assert extensions == {extension2}


@patch("jupyterlab.extensions.manager.requests")
async def test_ExtensionsManager_list_extensions_query_allow_block(mock_requests, monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")
    extension2 = ExtensionPackage("extension2", "Extension 2 description", "", "prebuilt")

    class Request(NamedTuple):
        text: str

    mock_requests.request.return_value = Request(
        json.dumps(
            {
                "allowed_extensions": [{"name": "extension1"}],
                "blocked_extensions": [{"name": "extension1"}],
            }
        )
    )

    async def mock_list(*args, **kwargs):
        return {"extension1": extension1, "extension2": extension2}, None

    monkeypatch.setattr(ReadOnlyExtensionsManager, "list_packages", mock_list)

    manager = ReadOnlyExtensionsManager(
        ext_options=dict(
            allowed_extensions_uris={"http://dummy-allowed-extension"},
            blocked_extensions_uris={"http://dummy-blocked-extension"},
        )
    )

    extensions = await manager.list_extensions("ext")

    assert extensions == {extension1}


async def test_ExtensionsManager_install():
    manager = ReadOnlyExtensionsManager()

    result = await manager.install("extension1")

    assert result.status == "error"
    assert result.message == "Extension installation not supported."


async def test_ExtensionsManager_uninstall():
    manager = ReadOnlyExtensionsManager()

    result = await manager.uninstall("extension1")

    assert result.status == "error"
    assert result.message == "Extension removal not supported."
