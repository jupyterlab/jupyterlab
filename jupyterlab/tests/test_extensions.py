# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import io
import json
import sys
import tarfile
from subprocess import CompletedProcess
from types import MethodType, SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import httpx2
import pytest
from tornado import web
from traitlets.config import Config, Configurable

from jupyterlab.extensions import PyPIExtensionManager, ReadOnlyExtensionManager
from jupyterlab.extensions.manager import (
    ActionResult,
    ExtensionManager,
    ExtensionPackage,
    PluginManager,
)
from jupyterlab.extensions.pypi import _check_python_version_compatible
from jupyterlab.handlers.extension_manager_handler import ExtensionHandler

from . import fake_client_factory


@pytest.mark.parametrize(
    "requires_python, expected",
    (
        (None, True),  # No requirement
        ("", True),  # Empty requirement
        (">=3.6", True),  # Should pass on any modern Python
        (">=3.6,<4", True),  # Common range
        (">=99.0", False),  # Future version
        ("<3.0", False),  # Very old Python
        ("invalid-specifier", True),  # Invalid specifier should default to compatible
    ),
)
def test_check_python_version_compatible(requires_python, expected):
    """Test the Python version compatibility check function."""
    result, _ = _check_python_version_compatible(requires_python)
    assert result == expected


def test_check_python_version_compatible_current_version():
    """Test that current Python version is compatible with its own specifier."""
    current = f">={sys.version_info.major}.{sys.version_info.minor}"
    assert _check_python_version_compatible(current)[0] is True


@patch("jupyterlab.extensions.pypi.LANGUAGE_PACKS", ("jupyterlab-language-pack-fr-FR",))
async def test_pypi_search_only_lists_language_packs(monkeypatch):
    browse = Mock(return_value=[("jupyterlab-git", "1.0.0")])
    monkeypatch.setattr("xmlrpc.client.ServerProxy", Mock(return_value=Mock(browse=browse)))
    manager = PyPIExtensionManager()
    get = AsyncMock(
        return_value=httpx2.Response(
            200, json={"info": {"version": "1.0.0", "summary": "French language pack"}}
        )
    )
    monkeypatch.setattr(manager._httpx_client, "get", get)

    extensions, _ = await manager.list_extensions("jupyterlab-git")
    assert extensions == []

    for query in ("FR-fr", "FRENCH"):
        packs, _ = await manager.list_extensions(query)
        assert [(pack.name, pack.latest_version) for pack in packs] == [
            ("jupyterlab-language-pack-fr-FR", "1.0.0")
        ]
    get.assert_awaited_once_with(
        f"{manager.base_url}/jupyterlab-language-pack-fr-FR/json",
        headers={"Content-Type": "application/json"},
    )
    browse.assert_not_called()


@patch(
    "jupyterlab.extensions.pypi.LANGUAGE_PACKS",
    ("jupyterlab-language-pack-de-DE", "jupyterlab-language-pack-fr-FR"),
)
async def test_pypi_lists_installed_language_packs_separately(monkeypatch, tmp_path):
    dist_info = tmp_path / "jupyterlab_language_pack_de_de-4.5.post3.dist-info"
    dist_info.mkdir()
    (dist_info / "METADATA").write_text(
        "Name: jupyterlab_language_pack_de_de\n"
        "Version: 4.5.post3\n"
        "Summary: German language pack\n"
        "Project-URL: homepage, https://github.com/jupyterlab/language-packs\n",
        encoding="utf-8",
    )
    (dist_info / "entry_points.txt").write_text(
        "[jupyterlab.languagepack]\nde_DE = jupyterlab_language_pack_de_DE\n",
        encoding="utf-8",
    )
    monkeypatch.syspath_prepend(str(tmp_path))
    monkeypatch.setattr(ExtensionManager, "_get_installed_extensions", AsyncMock(return_value={}))
    manager = PyPIExtensionManager()
    get = AsyncMock(return_value=httpx2.Response(200, json={"info": {"version": "4.5.post3"}}))
    monkeypatch.setattr(manager._httpx_client, "get", get)

    packs, _ = await manager.list_extensions()
    assert [
        (pack.name, pack.installed_version, pack.installed, pack.pkg_type) for pack in packs
    ] == [("jupyterlab-language-pack-de-de", "4.5.post3", True, "language-pack")]
    assert packs[0].description == "German language pack"
    assert packs[0].homepage_url == "https://github.com/jupyterlab/language-packs"
    get.assert_not_called()

    packs, last_page = await manager.list_extensions("", per_page=1)
    assert [pack.name for pack in packs] == ["jupyterlab-language-pack-fr-FR"]
    assert last_page == 1


@pytest.mark.parametrize(
    "requires_python, expected_allowed",
    (
        (">=3.6", True),  # Compatible with current Python
        (">=99.0", False),  # Incompatible - future version
        (None, True),  # No requirement - should be allowed
    ),
)
@patch("jupyterlab.extensions.pypi.LANGUAGE_PACKS", ("jupyterlab-language-pack-fr-FR",))
async def test_extension_package_allowed_set_from_python_compatibility(
    monkeypatch, requires_python, expected_allowed
):
    manager = PyPIExtensionManager()
    get = AsyncMock(
        return_value=httpx2.Response(
            200,
            json={
                "info": {
                    "version": "1.0.0",
                    "summary": "French language pack",
                    "requires_python": requires_python,
                }
            },
        )
    )
    monkeypatch.setattr(manager._httpx_client, "get", get)

    extensions, _ = await manager.list_extensions("fr-FR")

    assert len(extensions) == 1
    ext = extensions[0]
    assert ext.name == "jupyterlab-language-pack-fr-FR"
    assert ext.allowed == expected_allowed
    if not expected_allowed:
        assert "Requires Python" in ext.description
    else:
        assert ext.description == "French language pack"


@pytest.mark.parametrize(
    "version, expected",
    (
        ("1", "1"),
        ("1.0", "1.0"),
        ("1.0.0", "1.0.0"),
        ("1.0.0a52", "1.0.0-alpha.52"),
        ("1.0.0b3", "1.0.0-beta.3"),
        ("1.0.0rc22", "1.0.0-rc.22"),
        ("1.0.0rc23.post2", "1.0.0-rc.23"),
        ("1.0.0rc24.dev2", "1.0.0-rc.24"),
        ("1.0.0rc25.post4.dev2", "1.0.0-rc.25"),
    ),
)
def test_ExtensionManager_get_semver_version(version, expected):
    assert ExtensionManager.get_semver_version(version) == expected


async def test_ExtensionManager_list_extensions_installed(monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")

    async def mock_installed(*args, **kwargs):
        return {"extension1": extension1}

    monkeypatch.setattr(ReadOnlyExtensionManager, "_get_installed_extensions", mock_installed)

    manager = ReadOnlyExtensionManager()

    extensions = await manager.list_extensions()

    assert extensions == ([extension1], 1)


async def test_ExtensionManager_list_extensions_query(monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")
    extension2 = ExtensionPackage("extension2", "Extension 2 description", "", "prebuilt")

    async def mock_list(*args, **kwargs):
        return {"extension1": extension1, "extension2": extension2}, None

    monkeypatch.setattr(ReadOnlyExtensionManager, "list_packages", mock_list)

    manager = ReadOnlyExtensionManager()

    extensions = await manager.list_extensions("ext")

    assert extensions == ([extension1, extension2], 1)


@patch("tornado.httpclient.AsyncHTTPClient", new_callable=fake_client_factory)
async def test_ExtensionManager_list_extensions_query_allow(mock_client, monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")
    extension2 = ExtensionPackage("extension2", "Extension 2 description", "", "prebuilt")

    mock_client.body = json.dumps({"allowed_extensions": [{"name": "extension1"}]}).encode()

    async def mock_list(*args, **kwargs):
        return {"extension1": extension1, "extension2": extension2}, None

    monkeypatch.setattr(ReadOnlyExtensionManager, "list_packages", mock_list)

    manager = ReadOnlyExtensionManager(
        ext_options={"allowed_extensions_uris": {"http://dummy-allowed-extension"}},
    )

    extensions = await manager.list_extensions("ext")

    assert extensions == ([extension1], 1)


@patch("tornado.httpclient.AsyncHTTPClient", new_callable=fake_client_factory)
async def test_ExtensionManager_list_extensions_query_block(mock_client, monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")
    extension2 = ExtensionPackage("extension2", "Extension 2 description", "", "prebuilt")

    mock_client.body = json.dumps({"blocked_extensions": [{"name": "extension1"}]}).encode()

    async def mock_list(*args, **kwargs):
        return {"extension1": extension1, "extension2": extension2}, None

    monkeypatch.setattr(ReadOnlyExtensionManager, "list_packages", mock_list)

    manager = ReadOnlyExtensionManager(
        ext_options={"blocked_extensions_uris": {"http://dummy-blocked-extension"}}
    )

    extensions = await manager.list_extensions("ext")

    assert extensions == ([extension2], 1)


@patch("tornado.httpclient.AsyncHTTPClient", new_callable=fake_client_factory)
async def test_ExtensionManager_list_extensions_query_allow_block(mock_client, monkeypatch):
    extension1 = ExtensionPackage("extension1", "Extension 1 description", "", "prebuilt")
    extension2 = ExtensionPackage("extension2", "Extension 2 description", "", "prebuilt")

    mock_client.body = json.dumps(
        {
            "allowed_extensions": [{"name": "extension1"}],
            "blocked_extensions": [{"name": "extension1"}],
        }
    ).encode()

    async def mock_list(*args, **kwargs):
        return {"extension1": extension1, "extension2": extension2}, None

    monkeypatch.setattr(ReadOnlyExtensionManager, "list_packages", mock_list)

    manager = ReadOnlyExtensionManager(
        ext_options={
            "allowed_extensions_uris": {"http://dummy-allowed-extension"},
            "blocked_extensions_uris": {"http://dummy-blocked-extension"},
        }
    )

    extensions = await manager.list_extensions("ext")

    assert extensions == ([extension1], 1)


async def test_ExtensionManager_is_install_allowed_no_policy():
    manager = PyPIExtensionManager()
    assert await manager.is_install_allowed("any-extension") is True


@patch("tornado.httpclient.AsyncHTTPClient", new_callable=fake_client_factory)
async def test_ExtensionManager_is_install_allowed_allowlist(mock_client):
    mock_client.body = json.dumps({"allowed_extensions": [{"name": "jupyterlab-git"}]}).encode()
    manager = PyPIExtensionManager(
        ext_options={"allowed_extensions_uris": {"http://dummy-allowed-extension"}}
    )
    assert await manager.is_install_allowed("jupyterlab-git") is True
    assert await manager.is_install_allowed("jupyterlab-evil") is False


@pytest.mark.parametrize(
    "name",
    ["jupyterlab-git", "JupyterLab-Git", "JupyterLab.Git", "jupyterlab_git"],
)
async def test_pypi_manager_allows_canonical_package_name_allowlist_matches(name):
    manager = PyPIExtensionManager(
        ext_options={"allowed_extensions_uris": {"http://dummy-allowed-extension"}}
    )
    manager._listings_cache = {"jupyterlab-git": {"name": "jupyterlab-git"}}
    if manager._listing_fetch is not None:
        manager._listing_fetch.stop()

    assert await manager.is_install_allowed(name) is True
    assert await manager.is_install_allowed("jupyterlab-evil") is False


@patch("tornado.httpclient.AsyncHTTPClient", new_callable=fake_client_factory)
async def test_ExtensionManager_is_install_allowed_blocklist(mock_client):
    mock_client.body = json.dumps({"blocked_extensions": [{"name": "jupyterlab-evil"}]}).encode()
    manager = PyPIExtensionManager(
        ext_options={"blocked_extensions_uris": {"http://dummy-blocked-extension"}}
    )
    assert await manager.is_install_allowed("jupyterlab-evil") is False
    assert await manager.is_install_allowed("jupyterlab-git") is True


@pytest.mark.parametrize(
    "name",
    ["jupyterlab-git", "JupyterLab-Git", "JupyterLab.Git", "jupyterlab_git"],
)
async def test_handler_blocks_pypi_canonical_package_name_blocklist_matches(name):
    manager = PyPIExtensionManager(
        ext_options={"blocked_extensions_uris": {"http://dummy-blocked-extension"}}
    )
    manager._listings_cache = {"jupyterlab-git": {"name": "jupyterlab-git"}}
    if manager._listing_fetch is not None:
        manager._listing_fetch.stop()
    manager.install = AsyncMock(return_value=ActionResult(status="ok", needs_restart=[]))

    handler = Mock()
    handler.current_user = "user"
    handler.request.method = "POST"
    handler.auth_resource = ExtensionHandler.auth_resource
    handler.authorizer.is_authorized.return_value = True
    handler._check_install = MethodType(ExtensionHandler._check_install, handler)
    handler.get_json_body.return_value = {"cmd": "install", "extension_name": name}
    handler.manager = manager
    handler.set_status = Mock()
    handler.finish = Mock()

    with pytest.raises(web.HTTPError) as exc_info:
        await ExtensionHandler.post(handler)
    assert exc_info.value.status_code == 422
    assert "was blocked" in exc_info.value.log_message
    manager.install.assert_not_called()


async def test_pypi_manager_install_blocks_policy_denial_before_pip():
    manager = PyPIExtensionManager(
        ext_options={"blocked_extensions_uris": {"http://dummy-blocked-extension"}}
    )
    manager._listings_cache = {"jupyterlab-git": {"name": "jupyterlab-git"}}
    if manager._listing_fetch is not None:
        manager._listing_fetch.stop()

    with patch("jupyterlab.extensions.pypi.run") as run_mock:
        result = await manager.install("JupyterLab.Git")

    assert result == ActionResult(status="error", message="install is not allowed")
    run_mock.assert_not_called()


async def test_pypi_manager_install_reads_package_json_from_sdist():
    download_url = "https://example.com/test-extension-1.0.0.tar.gz"
    package_json = {
        "jupyterlab": {
            "discovery": {
                "kernel": True,
                "server": True,
            }
        }
    }
    package_json_data = json.dumps(package_json).encode("utf-8")
    sdist_content = io.BytesIO()
    with tarfile.open(fileobj=sdist_content, mode="w:gz") as sdist:
        package_json_info = tarfile.TarInfo(
            "test-extension-1.0.0/share/jupyter/labextensions/test/package.json"
        )
        package_json_info.size = len(package_json_data)
        sdist.addfile(package_json_info, io.BytesIO(package_json_data))

    dry_run_report = {
        "install": [
            {
                "metadata": {"name": "test-extension"},
                "download_info": {"url": download_url},
            }
        ]
    }

    def run_side_effect(cmd, *args, **kwargs):
        if "--dry-run" in cmd:
            return SimpleNamespace(stdout=json.dumps(dry_run_report).encode("utf-8"))
        return SimpleNamespace(returncode=0, stdout=b"", stderr=b"")

    manager = PyPIExtensionManager()
    manager.is_install_allowed = AsyncMock(return_value=True)
    manager._httpx_client.get = AsyncMock(
        return_value=SimpleNamespace(status_code=200, content=sdist_content.getvalue())
    )

    with patch("jupyterlab.extensions.pypi.run", side_effect=run_side_effect):
        result = await manager.install("test-extension")

    assert result == ActionResult(status="ok", needs_restart=["frontend", "kernel", "server"])
    manager._httpx_client.get.assert_awaited_once_with(download_url)


@patch("tornado.httpclient.AsyncHTTPClient", new_callable=fake_client_factory)
async def test_ExtensionManager_is_install_allowed_allowlist_takes_precedence(mock_client):
    mock_client.body = json.dumps(
        {
            "allowed_extensions": [{"name": "jupyterlab-git"}],
            "blocked_extensions": [{"name": "jupyterlab-git"}],  # allowlist takes precedence
        }
    ).encode()
    manager = PyPIExtensionManager(
        ext_options={
            "allowed_extensions_uris": {"http://dummy-allowed-extension"},
            "blocked_extensions_uris": {"http://dummy-blocked-extension"},
        }
    )
    assert await manager.is_install_allowed("jupyterlab-git") is True
    assert await manager.is_install_allowed("jupyterlab-evil") is False


async def test_ExtensionManager_install():
    manager = ReadOnlyExtensionManager()

    result = await manager.install("extension1")

    assert result.status == "error"
    assert result.message == "Extension installation not supported."


async def test_ExtensionManager_uninstall():
    manager = ReadOnlyExtensionManager()

    result = await manager.uninstall("extension1")

    assert result.status == "error"
    assert result.message == "Extension removal not supported."


@patch(
    "jupyterlab.extensions.pypi.LANGUAGE_PACKS",
    (
        "jupyterlab-language-pack-fr-FR",
        "jupyterlab-language-pack-de-DE",
        "jupyterlab-language-pack-et-EE",
        "jupyterlab-language-pack-ja-JP",
    ),
)
async def test_pypi_language_pack_pagination_skips_unavailable_packs(monkeypatch):
    manager = PyPIExtensionManager()
    unavailable = True

    async def get(url, *, headers):
        if url.endswith("/jupyterlab-language-pack-et-EE/json"):
            return httpx2.Response(404)
        if unavailable and url.endswith("/jupyterlab-language-pack-ja-JP/json"):
            raise httpx2.ConnectError("Connection refused")
        return httpx2.Response(
            200,
            json={
                "info": {
                    "version": "1.2.3rc1",
                    "summary": "A JupyterLab language pack",
                    "project_urls": {"Homepage": "https://github.com/jupyterlab/language-packs"},
                }
            },
        )

    monkeypatch.setattr(manager._httpx_client, "get", get)

    first_page, pages_count = await manager.list_extensions("", per_page=1)
    assert first_page == [
        ExtensionPackage(
            name="jupyterlab-language-pack-de-DE",
            description="A JupyterLab language pack",
            homepage_url="https://github.com/jupyterlab/language-packs",
            pkg_type="language-pack",
            latest_version="1.2.3-rc.1",
        )
    ]
    assert pages_count == 2

    second_page, pages_count = await manager.list_extensions("", page=2, per_page=1)
    assert [pack.name for pack in second_page] == ["jupyterlab-language-pack-fr-FR"]
    assert pages_count == 2

    unavailable = False
    _, pages_count = await manager.list_extensions("", per_page=1)
    assert pages_count == 3


@pytest.mark.parametrize(
    "failure",
    (
        httpx2.ConnectError("Connection refused"),
        httpx2.Response(503, request=httpx2.Request("GET", "https://pypi.org/pypi")),
    ),
)
@patch("jupyterlab.extensions.pypi.LANGUAGE_PACKS", ("jupyterlab-language-pack-fr-FR",))
async def test_pypi_language_pack_search_recovers(monkeypatch, failure):
    manager = PyPIExtensionManager()
    get = AsyncMock(
        side_effect=[failure, httpx2.Response(200, json={"info": {"version": "1.0.0"}})]
    )
    monkeypatch.setattr(manager._httpx_client, "get", get)

    with pytest.raises(web.HTTPError) as error:
        await manager.list_extensions("fr-FR")
    assert error.value.status_code == 503

    packs, _ = await manager.list_extensions("fr-FR")
    assert [pack.name for pack in packs] == ["jupyterlab-language-pack-fr-FR"]
    await manager.list_extensions("fr-FR")
    assert get.await_count == 2


async def test_PyPiExtensionManager_custom_server_url():
    BASE_URL = "https://mylocal.pypi.server/pypi"  # noqa

    parent = Configurable(config=Config({"PyPIExtensionManager": {"base_url": BASE_URL}}))

    manager = PyPIExtensionManager(parent=parent)

    assert manager.base_url == BASE_URL


LEVELS = ["user", "sys_prefix", "system"]


@pytest.mark.parametrize("level", LEVELS)
async def test_PyPiExtensionManager_custom_level(level):
    parent = Configurable(config=Config({"PyPIExtensionManager": {"level": level}}))
    manager = PyPIExtensionManager(parent=parent)
    assert manager.level == level


@pytest.mark.parametrize("level", LEVELS)
async def test_PyPiExtensionManager_inherits_custom_level(level):
    parent = Configurable(config=Config({"PluginManager": {"level": level}}))
    manager = PyPIExtensionManager(parent=parent)
    assert manager.level == level


@pytest.mark.parametrize("level", LEVELS)
async def test_PluginManager_custom_level(level):
    parent = Configurable(config=Config({"PluginManager": {"level": level}}))
    manager = PluginManager(parent=parent)
    assert manager.level == level


async def test_PluginManager_default_level():
    manager = PluginManager()
    assert manager.level == "sys_prefix"


@pytest.mark.parametrize(
    "name,expected",
    [
        ("jupyterlab-git", True),
        ("my_extension.pkg", True),
        # GHSA-37w4-hwhx-4rc4: VCS/URL names must be blocked
        ("git+https://github.com/attacker/malicious.git", False),
        ("/tmp/local-pkg", False),  # noqa: S108
        ("http://evil.com/pkg.tar.gz", False),
        ("-r/tmp/requirements.txt", False),
    ],
)
async def test_pypi_manager_is_install_allowed_rejects_non_pypi_names(name, expected):
    manager = PyPIExtensionManager()
    assert await manager.is_install_allowed(name) is expected


@pytest.mark.parametrize(
    "version,expected",
    [(None, True), ("1.2.3", True), ("not valid version", False)],
)
async def test_pypi_manager_is_install_allowed_rejects_non_pypi_versions(version, expected):
    manager = PyPIExtensionManager()
    assert await manager.is_install_allowed("package", version) is expected


async def test_pypi_manager_install_blocks_when_policy_denies():
    manager = PyPIExtensionManager()
    manager.is_install_allowed = AsyncMock(return_value=False)

    with patch("jupyterlab.extensions.pypi.tornado.ioloop.IOLoop.current") as current_loop:
        result = await manager.install("jupyterlab-evil", "1.0.0")

    assert result.status == "error"
    assert result.message == "install is not allowed"
    manager.is_install_allowed.assert_awaited_once_with("jupyterlab-evil", "1.0.0")
    current_loop.assert_not_called()


@pytest.mark.parametrize(
    "name,expected",
    [
        ("jupyterlab-git", True),
        ("JupyterLab.Git", True),
        ("my_extension.pkg", True),
        ("-r/tmp/requirements.txt", False),
        ("-rrequirements.txt", False),
        ("--requirement=/tmp/requirements.txt", False),
        ("--help", False),
    ],
)
async def test_pypi_manager_is_uninstall_allowed_rejects_non_pypi_names(name, expected):
    manager = PyPIExtensionManager()
    assert await manager.is_uninstall_allowed(name) is expected


@pytest.mark.parametrize(
    "name",
    [
        "-r/tmp/requirements.txt",
        "-rrequirements.txt",
        "--requirement=/tmp/requirements.txt",
        "--help",
    ],
)
async def test_pypi_manager_uninstall_blocks_invalid_name_before_pip(name):
    manager = PyPIExtensionManager()
    completed = CompletedProcess(args=[], returncode=0, stdout=b"", stderr=b"")

    with patch("jupyterlab.extensions.pypi.tornado.ioloop.IOLoop.current") as current_loop:
        current_loop.return_value.run_in_executor = AsyncMock(return_value=completed)
        result = await manager.uninstall(name)

    assert result == ActionResult(status="error", message="uninstall is not allowed")
    current_loop.assert_not_called()
    current_loop.return_value.run_in_executor.assert_not_called()


async def test_handler_blocks_install_when_policy_denies():
    handler = Mock()
    handler.current_user = "user"
    handler.request.method = "POST"
    handler.auth_resource = ExtensionHandler.auth_resource
    handler.authorizer.is_authorized.return_value = True
    handler._check_install = MethodType(ExtensionHandler._check_install, handler)
    handler.get_json_body.return_value = {"cmd": "install", "extension_name": "jupyterlab-evil"}
    handler.manager.is_install_allowed = AsyncMock(return_value=False)

    with pytest.raises(web.HTTPError) as exc_info:
        await ExtensionHandler.post(handler)
    assert exc_info.value.status_code == 422
    assert "was blocked" in exc_info.value.log_message
    handler.manager.is_install_allowed.assert_called_once_with("jupyterlab-evil", None)
    handler.manager.install.assert_not_called()


async def test_handler_blocks_uninstall_when_name_is_not_allowed():
    handler = Mock()
    handler.current_user = "user"
    handler.request.method = "POST"
    handler.auth_resource = ExtensionHandler.auth_resource
    handler.authorizer.is_authorized.return_value = True
    handler._check_install = MethodType(ExtensionHandler._check_install, handler)
    handler.get_json_body.return_value = {
        "cmd": "uninstall",
        "extension_name": "-r/tmp/requirements.txt",
    }
    handler.manager.is_uninstall_allowed = AsyncMock(return_value=False)
    handler.manager.uninstall = AsyncMock(return_value=ActionResult(status="ok", needs_restart=[]))

    with pytest.raises(web.HTTPError) as exc_info:
        await ExtensionHandler.post(handler)

    assert exc_info.value.status_code == 422
    assert "was blocked" in exc_info.value.log_message
    handler.manager.is_uninstall_allowed.assert_awaited_once_with("-r/tmp/requirements.txt")
    handler.manager.uninstall.assert_not_called()
