# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
"""Tests for the FileWatchHandler WebSocket endpoint."""

import asyncio
import json
from unittest.mock import MagicMock, patch

import pytest

from jupyterlab.handlers.file_watch_handler import (
    FileWatchHandler,
    _BridgeEventHandler,
    file_watch_handler_path,
)

# ---------------------------------------------------------------------------
# Fixture — register the handler with the test server
# ---------------------------------------------------------------------------


@pytest.fixture
def file_watch_app(jp_serverapp, make_labserver_extension_app):
    app = make_labserver_extension_app()
    app._link_jupyter_server_extension(jp_serverapp)
    app.handlers.extend([(file_watch_handler_path, FileWatchHandler)])
    app.initialize()
    return app


# ---------------------------------------------------------------------------
# Unit tests (all Observer / watchdog interactions are mocked)
# ---------------------------------------------------------------------------


async def test_unavailable_when_watchdog_missing(file_watch_app, jp_ws_fetch):
    """Handler sends 'unavailable' when watchdog is not installed."""
    with patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", False):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        raw = await ws.read_message()
        msg = json.loads(raw)
        assert msg["msgType"] == "unavailable"
        assert "watchdog" in msg["reason"].lower()
        ws.close()


async def test_subscribe_starts_observer(file_watch_app, jp_ws_fetch, jp_root_dir):
    """Subscribe message creates and starts a watchdog Observer."""
    (jp_root_dir / "watch_test.txt").write_text("hello")

    mock_observer = MagicMock()

    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch(
            "jupyterlab.handlers.file_watch_handler.Observer",
            return_value=mock_observer,
            create=True,
        ),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "watch_test.txt"}))
        await asyncio.sleep(0.05)

        assert mock_observer.start.called
        ws.close()


async def test_unsubscribe_stops_observer(file_watch_app, jp_ws_fetch, jp_root_dir):
    """Unsubscribe message stops and joins the Observer."""
    (jp_root_dir / "watch_test2.txt").write_text("hello")

    mock_observer = MagicMock()

    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch(
            "jupyterlab.handlers.file_watch_handler.Observer",
            return_value=mock_observer,
            create=True,
        ),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "watch_test2.txt"}))
        await asyncio.sleep(0.05)
        await ws.write_message(json.dumps({"msgType": "unsubscribe", "path": "watch_test2.txt"}))
        await asyncio.sleep(0.05)

        assert mock_observer.stop.called
        ws.close()


async def test_path_traversal_rejected(file_watch_app, jp_ws_fetch):
    """Paths that escape the server root are rejected with an error message."""
    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch("jupyterlab.handlers.file_watch_handler.Observer", create=True),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "../../../etc/passwd"}))
        raw = await ws.read_message()
        msg = json.loads(raw)
        assert msg["msgType"] == "error"
        ws.close()


async def test_changed_message_forwarded(file_watch_app, jp_ws_fetch, jp_root_dir):
    """When watchdog fires an event the handler forwards a 'changed' WS message."""
    (jp_root_dir / "notify_test.txt").write_text("v1")

    mock_observer = MagicMock()
    captured: dict = {}

    def fake_bridge(abs_p, rel_p, callback, loop):
        captured["callback"] = callback
        return MagicMock()

    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch(
            "jupyterlab.handlers.file_watch_handler.Observer",
            return_value=mock_observer,
            create=True,
        ),
        patch(
            "jupyterlab.handlers.file_watch_handler._BridgeEventHandler",
            side_effect=fake_bridge,
        ),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "notify_test.txt"}))
        await asyncio.sleep(0.05)

        assert "callback" in captured, "BridgeEventHandler callback was not captured"

        # Simulate an OS-level modified event from the watchdog thread
        captured["callback"]("notify_test.txt", "modified")
        await asyncio.sleep(0.05)

        raw = await ws.read_message()
        msg = json.loads(raw)
        assert msg["msgType"] == "changed"
        assert msg["path"] == "notify_test.txt"
        assert msg["eventType"] == "modified"
        ws.close()


async def test_subscribe_twice_does_not_create_two_observers(
    file_watch_app, jp_ws_fetch, jp_root_dir
):
    """Subscribing the same path twice only starts one Observer."""
    (jp_root_dir / "dup.txt").write_text("x")

    observers: list = []

    def make_observer():
        obs = MagicMock()
        observers.append(obs)
        return obs

    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch(
            "jupyterlab.handlers.file_watch_handler.Observer",
            side_effect=make_observer,
            create=True,
        ),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "dup.txt"}))
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "dup.txt"}))
        await asyncio.sleep(0.05)

        assert len(observers) == 1
        ws.close()


async def test_malformed_message_is_ignored(file_watch_app, jp_ws_fetch, jp_root_dir):
    """Non-JSON or invalid messages are silently dropped — connection stays open."""
    (jp_root_dir / "ok.txt").write_text("x")

    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch(
            "jupyterlab.handlers.file_watch_handler.Observer",
            return_value=MagicMock(),
            create=True,
        ),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        # Garbage payload
        await ws.write_message("not json at all")
        # Path is not a string
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": 42}))
        # Unknown msgType — silently ignored
        await ws.write_message(json.dumps({"msgType": "bogus", "path": "ok.txt"}))
        # A legitimate subscribe must still go through after the garbage.
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "ok.txt"}))
        await asyncio.sleep(0.05)
        ws.close()


async def test_atomic_rename_is_reported_as_modified(file_watch_app, jp_ws_fetch, jp_root_dir):
    """A tmp file renamed onto the watched path (vim, JetBrains save) → modified event."""
    target = jp_root_dir / "atomic.txt"
    target.write_text("v1")

    mock_observer = MagicMock()
    captured_handler: dict = {}

    def fake_bridge(abs_p, rel_p, callback, loop):
        # Use the real (already-imported) handler so we exercise on_moved.
        h = _BridgeEventHandler(abs_p, rel_p, callback, loop)
        captured_handler["handler"] = h
        captured_handler["abs_path"] = abs_p
        return h

    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch(
            "jupyterlab.handlers.file_watch_handler.Observer",
            return_value=mock_observer,
            create=True,
        ),
        patch(
            "jupyterlab.handlers.file_watch_handler._BridgeEventHandler",
            side_effect=fake_bridge,
        ),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "atomic.txt"}))
        await asyncio.sleep(0.05)

        # Simulate the atomic-save move: tmp file renamed onto the watched path.
        abs_path = captured_handler["abs_path"]
        fake_event = MagicMock()
        fake_event.is_directory = False
        fake_event.src_path = abs_path + ".tmp"
        fake_event.dest_path = abs_path
        captured_handler["handler"].on_moved(fake_event)
        await asyncio.sleep(0.05)

        raw = await ws.read_message()
        msg = json.loads(raw)
        assert msg["msgType"] == "changed"
        assert msg["path"] == "atomic.txt"
        assert msg["eventType"] == "modified"
        ws.close()


async def test_catch_up_emits_synthetic_modified_event(file_watch_app, jp_ws_fetch, jp_root_dir):
    """If the file changes during the OS-watcher setup window, fire a synthetic modified event."""
    target = jp_root_dir / "race.txt"
    target.write_text("v1")

    mock_observer = MagicMock()

    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch(
            "jupyterlab.handlers.file_watch_handler.Observer",
            return_value=mock_observer,
            create=True,
        ),
        patch.object(FileWatchHandler, "SETUP_GRACE_SECONDS", 0.1),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "race.txt"}))
        # Modify the file DURING the setup-grace window.
        await asyncio.sleep(0.02)
        target.write_text("v2")

        # The catch-up step inside _subscribe should produce a synthetic
        # 'modified' message after the grace window elapses.
        raw = await asyncio.wait_for(ws.read_message(), timeout=2.0)
        msg = json.loads(raw)
        assert msg["msgType"] == "changed"
        assert msg["path"] == "race.txt"
        assert msg["eventType"] == "modified"
        ws.close()


async def test_close_stops_all_observers(file_watch_app, jp_ws_fetch, jp_root_dir):
    """Closing the WebSocket stops all active observers."""
    (jp_root_dir / "file_a.txt").write_text("a")
    (jp_root_dir / "file_b.txt").write_text("b")

    observers: list = []

    def make_observer():
        obs = MagicMock()
        observers.append(obs)
        return obs

    with (
        patch("jupyterlab.handlers.file_watch_handler.WATCHDOG_AVAILABLE", True),
        patch(
            "jupyterlab.handlers.file_watch_handler.Observer",
            side_effect=make_observer,
            create=True,
        ),
    ):
        ws = await jp_ws_fetch("lab", "api", "filewatch")
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "file_a.txt"}))
        await ws.write_message(json.dumps({"msgType": "subscribe", "path": "file_b.txt"}))
        await asyncio.sleep(0.05)

        ws.close()
        await asyncio.sleep(0.05)

        assert len(observers) == 2
        for obs in observers:
            assert obs.stop.called


# ---------------------------------------------------------------------------
# Integration test — requires watchdog installed, skipped otherwise
# ---------------------------------------------------------------------------


async def test_real_file_change_detected(file_watch_app, jp_ws_fetch, jp_root_dir):
    """End-to-end: modifying a real file triggers a 'changed' WebSocket message."""
    pytest.importorskip("watchdog", reason="watchdog not installed")
    target = jp_root_dir / "real_watch.txt"
    target.write_text("version1")

    ws = await jp_ws_fetch("lab", "api", "filewatch")
    await ws.write_message(json.dumps({"msgType": "subscribe", "path": "real_watch.txt"}))
    # Give watchdog time to set up the OS watch
    await asyncio.sleep(0.5)

    target.write_text("version2")

    # Wait up to 3 s for the notification
    try:
        raw = await asyncio.wait_for(ws.read_message(), timeout=3.0)
    except asyncio.TimeoutError:  # pragma: no cover
        pytest.fail("No 'changed' message received within 3 seconds")

    msg = json.loads(raw)
    assert msg["msgType"] == "changed"
    assert msg["path"] == "real_watch.txt"
    assert msg["eventType"] == "modified"
    ws.close()
