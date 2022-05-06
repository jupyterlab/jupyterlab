"""Echo WebSocket handler for real time collaboration with Yjs"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import asyncio
from typing import Optional

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
        file_type, file_path = path.split(":", 1)
        if file_path not in self.rooms.keys():
            self.rooms[file_path] = JupyterRoom(file_type)
        return self.rooms[file_path]


WEBSOCKET_SERVER = JupyterWebsocketServer(rooms_ready=False, auto_clean_rooms=False)


class YDocWebSocketHandler(WebSocketHandler, JupyterHandler):

    saving_document: Optional[asyncio.Task]

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

    async def get(self, *args, **kwargs):
        if self.get_current_user() is None:
            self.log.warning("Couldn't authenticate WebSocket connection")
            raise web.HTTPError(403)
        return await super().get(*args, **kwargs)

    async def open(self, path):
        self.path = path  # needed to be compatible with WebsocketServer (websocket.path)
        self._message_queue = asyncio.Queue()
        self.file_type, self.file_path = path.split(":", 1)
        self.saving_document = None
        self.room = WEBSOCKET_SERVER.get_room(path)
        asyncio.create_task(WEBSOCKET_SERVER.serve(self))

        # cancel the deletion of the room if it was scheduled
        if self.room.cleaner is not None:
            self.room.cleaner.cancel()

        if not self.room.ready:
            model = await ensure_async(
                self.contents_manager.get(self.file_path, type=self.file_type)
            )
            self.last_modified = model["last_modified"]
            # check again if ready, because loading the file can be async
            if not self.room.ready:
                self.room.document.source = model["content"]
                self.room.ready = True
                self.room.watcher = asyncio.create_task(self.watch_file())
                # save the document when changed
                self.room.document.observe(self.on_document_change)

    async def watch_file(self):
        poll_interval = self.settings["collab_file_poll_interval"]
        if not poll_interval:
            self.room.watcher = None
            return
        while True:
            await asyncio.sleep(poll_interval)
            await self.maybe_load_document()

    async def maybe_load_document(self):
        model = await ensure_async(
            self.contents_manager.get(self.file_path, content=False, type=self.file_type)
        )
        # do nothing if the file was saved by us
        if self.last_modified < model["last_modified"]:
            model = await ensure_async(
                self.contents_manager.get(self.file_path, type=self.file_type)
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
            new_room_name = message[1:].decode("utf-8").split(":", 1)[1]
            self.path = f"{self.file_type}:{new_room_name}"
            self.file_path = new_room_name
            WEBSOCKET_SERVER.rename_room(new_room_name, from_room=self.room)
            # send rename acknowledge
            self.write_message(bytes([RENAME_SESSION, 1]), binary=True)

    def on_close(self) -> bool:
        # stop serving this client
        self._message_queue.put_nowait(b"")
        if not self.room.clients:
            # keep the document for a while after every client disconnects
            self.room.cleaner = asyncio.create_task(self.clean_room())
        return True

    async def clean_room(self) -> None:
        await asyncio.sleep(60)
        if self.room.watcher:
            self.room.watcher.cancel()
        self.room.document.unobserve()
        WEBSOCKET_SERVER.delete_room(room=self.room)

    def on_document_change(self, event):
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
        path = WEBSOCKET_SERVER.get_room_name(self.room)
        model = await ensure_async(
            self.contents_manager.get(path, content=False, type=self.file_type)
        )
        if self.last_modified < model["last_modified"]:
            # file changed on disk, let's revert
            model = await ensure_async(self.contents_manager.get(path, type=self.file_type))
            self.room.document.source = model["content"]
            self.last_modified = model["last_modified"]
            return
        model["format"] = "text"
        model["content"] = self.room.document.source
        model = await ensure_async(self.contents_manager.save(model, path))
        self.last_modified = model["last_modified"]
        self.room.document.dirty = False

    def check_origin(self, origin) -> bool:
        return True
