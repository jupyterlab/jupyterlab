"""Echo WebSocket handler for real time collaboration with Yjs"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import asyncio
from typing import Optional, Tuple

from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.utils import ensure_async
from jupyter_ydoc import ydocs as YDOCS
from tornado import web
from tornado.websocket import WebSocketHandler
from ypy_websocket.websocket_server import WebsocketServer, YRoom

YFILE = YDOCS["file"]

RENAME_SESSION = 127


class JupyterRoom(YRoom):
    def __init__(self, type):
        super().__init__(ready=False)
        self.type = type
        self.cleaner = None
        self.watcher = None
        self.document = YDOCS.get(type, YFILE)(self.ydoc)


class JupyterWebsocketServer(WebsocketServer):
    def get_room(self, path: str) -> JupyterRoom:
        file_format, file_type, file_path = path.split(":", 2)
        if path not in self.rooms.keys():
            self.rooms[path] = JupyterRoom(file_type)
        return self.rooms[path]


class YDocWebSocketHandler(WebSocketHandler, JupyterHandler):

    saving_document: Optional[asyncio.Task]
    websocket_server = JupyterWebsocketServer(rooms_ready=False, auto_clean_rooms=False)

    # Override max_message size to 1GB
    @property
    def max_message_size(self):
        return 1024 * 1024 * 1024

    def __aiter__(self):
        # needed to be compatible with WebsocketServer (async for message in websocket)
        return self

    async def __anext__(self):
        # needed to be compatible with WebsocketServer (async for message in websocket)
        message = await self._message_queue.get()
        if not message:
            raise StopAsyncIteration()
        return message

    def get_file_info(self) -> Tuple[str]:
        room_name = self.websocket_server.get_room_name(self.room)
        file_format, file_type, file_path = room_name.split(":", 2)
        return file_format, file_type, file_path

    def set_file_info(self, value: str) -> None:
        self.websocket_server.rename_room(value, from_room=self.room)
        self.path = value  # needed to be compatible with WebsocketServer (websocket.path)

    async def get(self, *args, **kwargs):
        if self.get_current_user() is None:
            self.log.warning("Couldn't authenticate WebSocket connection")
            raise web.HTTPError(403)
        return await super().get(*args, **kwargs)

    async def open(self, path):
        self._message_queue = asyncio.Queue()
        self.room = self.websocket_server.get_room(path)
        self.set_file_info(path)
        self.saving_document = None
        asyncio.create_task(self.websocket_server.serve(self))

        # cancel the deletion of the room if it was scheduled
        if self.room.cleaner is not None:
            self.room.cleaner.cancel()

        if not self.room.ready:
            file_format, file_type, file_path = self.get_file_info()
            model = await ensure_async(
                self.contents_manager.get(file_path, type=file_type, format=file_format)
            )
            self.last_modified = model["last_modified"]
            # check again if ready, because loading the file can be async
            if not self.room.ready:
                self.room.document.source = model["content"]
                self.room.document.dirty = False
                self.room.ready = True
                self.room.watcher = asyncio.create_task(self.watch_file())
                # save the document when changed
                self.room.document.observe(self.on_document_change)

    async def watch_file(self):
        poll_interval = self.settings["collaborative_file_poll_interval"]
        if not poll_interval:
            self.room.watcher = None
            return
        while True:
            await asyncio.sleep(poll_interval)
            await self.maybe_load_document()

    async def maybe_load_document(self):
        file_format, file_type, file_path = self.get_file_info()
        model = await ensure_async(
            self.contents_manager.get(file_path, content=False, type=file_type, format=file_format)
        )
        # do nothing if the file was saved by us
        if self.last_modified < model["last_modified"]:
            model = await ensure_async(
                self.contents_manager.get(file_path, type=file_type, format=file_format)
            )
            self.room.document.source = model["content"]
            self.last_modified = model["last_modified"]

    async def send(self, message):
        # needed to be compatible with WebsocketServer (websocket.send)
        self.write_message(message, binary=True)

    async def recv(self):
        message = await self._message_queue.get()
        return message

    def on_message(self, message):
        self._message_queue.put_nowait(message)
        if message[0] == RENAME_SESSION:
            # The client moved the document to a different location. After receiving this message, we make the current document available under a different url.
            # The other clients are automatically notified of this change because the path is shared through the Yjs document as well.
            self.set_file_info(message[1:].decode("utf-8"))
            self.websocket_server.rename_room(self.path, from_room=self.room)
            # send rename acknowledge
            self.write_message(bytes([RENAME_SESSION, 1]), binary=True)

    def on_close(self) -> bool:
        # stop serving this client
        self._message_queue.put_nowait(b"")
        if self.room.clients == [self]:
            # no client in this room after we disconnect
            # keep the document for a while in case someone reconnects
            self.room.cleaner = asyncio.create_task(self.clean_room())
        return True

    async def clean_room(self) -> None:
        seconds = self.settings["collaborative_document_cleanup_delay"]
        if seconds is None:
            return
        await asyncio.sleep(seconds)
        if self.room.watcher:
            self.room.watcher.cancel()
        self.room.document.unobserve()
        self.websocket_server.delete_room(room=self.room)

    def on_document_change(self, event):
        try:
            dirty = event.keys["dirty"]["newValue"]
            if not dirty:
                # we cleared the dirty flag, nothing to save
                return
        except Exception:
            pass
        # unobserve and observe again because the structure of the document may have changed
        # e.g. a new cell added to a notebook
        self.room.document.unobserve()
        self.room.document.observe(self.on_document_change)
        if self.saving_document is not None and not self.saving_document.done():
            # the document is being saved, cancel that
            self.saving_document.cancel()
            self.saving_document = None
        self.saving_document = asyncio.create_task(self.maybe_save_document())

    async def maybe_save_document(self):
        # save after 1 second of inactivity to prevent too frequent saving
        await asyncio.sleep(1)
        file_format, file_type, file_path = self.get_file_info()
        model = await ensure_async(
            self.contents_manager.get(file_path, type=file_type, format=file_format)
        )
        if self.last_modified < model["last_modified"]:
            # file changed on disk, let's revert
            self.room.document.source = model["content"]
            self.last_modified = model["last_modified"]
            return
        if model["content"] != self.room.document.source:
            # don't save if not needed
            # this also prevents the dirty flag from bouncing between windows of
            # the same document opened as different types (e.g. notebook/text editor)
            model["format"] = file_format
            model["content"] = self.room.document.source
            model = await ensure_async(self.contents_manager.save(model, file_path))
            self.last_modified = model["last_modified"]
        self.room.document.dirty = False

    def check_origin(self, origin) -> bool:
        return True
