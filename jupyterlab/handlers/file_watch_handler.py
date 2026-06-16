# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
"""WebSocket handler for OS-level filesystem notifications."""

import asyncio
import json
import os
from pathlib import Path

from jupyter_server.base.handlers import JupyterHandler
from tornado import web
from tornado.websocket import WebSocketHandler

try:
    from watchdog.events import FileSystemEvent, FileSystemEventHandler
    from watchdog.observers import Observer

    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False


class _BridgeEventHandler(FileSystemEventHandler if WATCHDOG_AVAILABLE else object):
    """Bridges watchdog's background thread into Tornado's IOLoop."""

    def __init__(
        self,
        abs_path: str,
        rel_path: str,
        callback,
        loop: asyncio.AbstractEventLoop,
    ):
        if WATCHDOG_AVAILABLE:
            super().__init__()
        self._abs_path = abs_path
        self._rel_path = rel_path
        self._callback = callback
        self._loop = loop

    def _emit(self, event_type: str) -> None:
        self._loop.call_soon_threadsafe(self._callback, self._rel_path, event_type)

    def on_modified(self, event: "FileSystemEvent") -> None:
        if not event.is_directory and event.src_path == self._abs_path:
            self._emit("modified")

    def on_deleted(self, event: "FileSystemEvent") -> None:
        if not event.is_directory and event.src_path == self._abs_path:
            self._emit("deleted")

    def on_created(self, event: "FileSystemEvent") -> None:
        # Reappearance after a delete (e.g. `rm` + `echo > file`) — treat as modified.
        if not event.is_directory and event.src_path == self._abs_path:
            self._emit("modified")

    def on_moved(self, event: "FileSystemEvent") -> None:
        if event.is_directory:
            return
        # Watched file was renamed away (rare, but record it).
        if event.src_path == self._abs_path:
            self._emit("moved")
            return
        # Atomic-save pattern (vim, JetBrains, many GUI editors): a temp file
        # is renamed onto the watched path. From the user's point of view the
        # file content changed, so surface it as a "modified" event.
        if getattr(event, "dest_path", None) == self._abs_path:
            self._emit("modified")


class FileWatchHandler(JupyterHandler, WebSocketHandler):
    """
    WebSocket handler that watches specific files for OS-level changes.

    URL: /lab/api/filewatch

    Protocol:
      Client → Server:
        {"msgType": "subscribe",   "path": "relative/path"}
        {"msgType": "unsubscribe", "path": "relative/path"}

      Server → Client:
        {"msgType": "changed",     "path": "...", "eventType": "modified|deleted|moved"}
        {"msgType": "unavailable", "reason": "..."}
        {"msgType": "error",       "message": "..."}
    """

    def initialize(self) -> None:
        super().initialize()
        # Map from relative path -> (Observer, _BridgeEventHandler)
        self._watches: dict[str, tuple] = {}
        # Strong refs to background subscribe tasks. asyncio only keeps
        # weak references to tasks, so without this set a task could be
        # garbage-collected mid-execution.
        self._subscribe_tasks: set = set()

    @web.authenticated
    async def get(self, *args, **kwargs):
        await super().get(*args, **kwargs)

    def open(self) -> None:
        if not WATCHDOG_AVAILABLE:
            self._send({"msgType": "unavailable", "reason": "watchdog is not installed"})
            return
        self.log.debug("FileWatchHandler: WebSocket opened")

    def on_message(self, raw: str) -> None:
        try:
            msg = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return
        msg_type = msg.get("msgType")
        path = msg.get("path", "")
        if not isinstance(path, str):
            return
        if msg_type == "subscribe":
            # Run as a task so the brief setup-window check inside _subscribe
            # does not block other incoming messages (e.g. concurrent subscribes
            # when multiple files are opened back-to-back).
            task = asyncio.create_task(self._subscribe(path))
            self._subscribe_tasks.add(task)
            task.add_done_callback(self._subscribe_tasks.discard)
        elif msg_type == "unsubscribe":
            self._unsubscribe(path)

    def on_close(self) -> None:
        for rel_path in list(self._watches):
            self._unsubscribe(rel_path)
        self.log.debug("FileWatchHandler: WebSocket closed")

    # ------------------------------------------------------------------ #
    # Private helpers
    # ------------------------------------------------------------------ #

    def _resolve_and_validate(self, rel_path: str) -> "str | None":
        """Resolve rel_path against server root; return abs path or None."""
        root = Path(self.settings.get("server_root_dir", os.getcwd())).expanduser().resolve()
        try:
            abs_path = (root / rel_path).resolve()
            abs_path.relative_to(root)  # raises ValueError if outside root
        except ValueError:
            self._send({"msgType": "error", "message": "Path is outside the root directory"})
            return None
        except OSError as exc:
            self._send({"msgType": "error", "message": f"Cannot resolve path: {exc}"})
            return None
        return str(abs_path)

    # FSEvents (macOS) / inotify (Linux) need a brief moment between
    # `observer.start()` and the watch being effectively armed at the OS
    # level. Without a catch-up step here, external changes that happen
    # within this window are silently missed — the symptom users see is
    # "auto-reload does not work on first open, but works after a reload".
    SETUP_GRACE_SECONDS = 0.2

    async def _subscribe(self, rel_path: str) -> None:
        if not WATCHDOG_AVAILABLE or rel_path in self._watches:
            return
        abs_path = self._resolve_and_validate(rel_path)
        if abs_path is None:
            return

        loop = asyncio.get_running_loop()

        def _on_event(path: str, event_type: str) -> None:
            if not self.ws_connection:
                return
            try:
                self.write_message(
                    json.dumps({"msgType": "changed", "path": path, "eventType": event_type})
                )
            except Exception:
                self.log.debug("FileWatchHandler: write_message failed", exc_info=True)

        handler = _BridgeEventHandler(abs_path, rel_path, _on_event, loop)
        observer = Observer()
        observer.schedule(handler, path=os.path.dirname(abs_path), recursive=False)

        # Snapshot mtime BEFORE start so we can detect any change that lands
        # during the OS watch's setup window.
        try:
            initial_mtime = os.path.getmtime(abs_path)
        except OSError:
            initial_mtime = None

        observer.start()
        self._watches[rel_path] = (observer, handler)
        self.log.debug("FileWatchHandler: subscribed to %s", rel_path)

        await self._catch_up_changes(rel_path, abs_path, initial_mtime, _on_event)

    async def _catch_up_changes(
        self,
        rel_path: str,
        abs_path: str,
        initial_mtime: "float | None",
        on_event,
    ) -> None:
        """Sleep through the OS-watcher setup window and replay any change.

        FSEvents/inotify need a brief moment after observer.start() to fully
        arm the watch. Changes during that window would otherwise be lost.
        """
        await asyncio.sleep(self.SETUP_GRACE_SECONDS)
        if rel_path not in self._watches:
            # Unsubscribed during the grace window — nothing more to do.
            return
        try:
            current_mtime = os.path.getmtime(abs_path)
        except OSError:
            if initial_mtime is not None:
                on_event(rel_path, "deleted")
            return
        if initial_mtime is not None and current_mtime != initial_mtime:
            on_event(rel_path, "modified")

    def _unsubscribe(self, rel_path: str) -> None:
        entry = self._watches.pop(rel_path, None)
        if entry is None:
            return
        observer, _ = entry
        observer.stop()
        observer.join(timeout=2)
        self.log.debug("FileWatchHandler: unsubscribed from %s", rel_path)

    def _send(self, msg: dict) -> None:
        try:
            self.write_message(json.dumps(msg))
        except Exception:
            self.log.debug("FileWatchHandler: _send failed", exc_info=True)


file_watch_handler_path = r"/lab/api/filewatch"
