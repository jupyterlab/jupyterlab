"""Echo WebSocket handler for real time collaboration with Yjs"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import asyncio
import sys
from pathlib import Path
from typing import Optional

from jupyter_server.base.handlers import JupyterHandler

# from jupyter_server.services.contents.fileio import (
#     AsyncFileManagerMixin,
#     FileManagerMixin,
# )
from jupyter_server.utils import ensure_async
from tornado import web
from tornado.websocket import WebSocketHandler
from watchfiles import awatch
from ypy_websocket.websocket_server import WebsocketServer, YRoom

# See compatibility note on `group` keyword in https://docs.python.org/3/library/importlib.metadata.html#entry-points
if sys.version_info < (3, 10):
    from importlib_metadata import entry_points
else:
    from importlib.metadata import entry_points

YDOCS = {}
for ep in entry_points(group="jupyter_ydoc"):
    YDOCS.update({ep.name: ep.load()})

YFILE = YDOCS["file"]

RENAME_SESSION = 127


class JupyterRoom(YRoom):
    def __init__(self, type):
        super().__init__(has_internal_ydoc=True)
        self.type = type
        self.cleaner = None
        self.watcher = None
        self.document = YDOCS.get(type, YFILE)(self.ydoc)


class JupyterWebsocketServer(WebsocketServer):
    def get_room(self, path: str) -> JupyterRoom:
        file_type, file_path = path.split(":", 1)
        room = self.rooms.get(file_path, JupyterRoom(file_type))
        self.rooms[file_path] = room
        return room


WEBSOCKET_SERVER = JupyterWebsocketServer(has_internal_ydoc=True, auto_clean_rooms=False)


class YjsEchoWebSocket(WebSocketHandler, JupyterHandler):

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

        if not self.room.ydoc.initialized.is_set():
            model = await ensure_async(
                self.contents_manager.get(self.file_path, type=self.file_type)
            )
            self.last_modified = model["last_modified"]
            # check again if initialized, because loading the file can be async
            if not self.room.ydoc.initialized.is_set():
                self.room.document.source = model["content"]
                self.room.document.ydoc.initialized.set()
                self.room.watcher = asyncio.create_task(self.watch_file())
                # save the document when changed
                self.room.document.observe(self.maybe_save_document)

    async def watch_file(self):
        # can only watch file changes if local file system
        # if/when https://github.com/jupyter-server/jupyter_server/pull/783 gets in,
        # we will check for a contents manager ability to watch file changes
        if False:  # isinstance(self.contents_manager, (FileManagerMixin, AsyncFileManagerMixin)):
            abs_path = Path(self.file_path).resolve()

            def filter(change, path):
                return Path(path).resolve() == abs_path

            async for _ in awatch(abs_path.parent, watch_filter=filter):
                await self.maybe_load_document()
        else:
            while True:
                await asyncio.sleep(1)
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

    def on_message(self, message):
        self._message_queue.put_nowait(message)
        if message[0] == RENAME_SESSION:
            # The client moved the document to a different location. After receiving this message, we make the current document available under a different url.
            # The other clients are automatically notified of this change because the path is shared through the Yjs document as well.
            new_room_name = message[1:].decode("utf-8").split(":", 1)[1]
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
        self.room.watcher.cancel()
        self.room.document.unobserve()
        WEBSOCKET_SERVER.delete_room(room=self.room)

    def maybe_save_document(self, event):
        # unobserve and observe again because the structure of the document may have changed
        # e.g. a new cell added to a notebook
        self.room.document.unobserve()
        self.room.document.observe(self.maybe_save_document)
        if self.saving_document is not None and not self.saving_document.done():
            # the document is being saved, cancel that
            self.saving_document.cancel()
            self.saving_document = None
        self.saving_document = asyncio.create_task(self.save_document())

    async def save_document(self):
        # save after 1 second of inactivity to prevent too frequent saving
        await asyncio.sleep(1)
        path = WEBSOCKET_SERVER.get_room_name(self.room)
        model = await ensure_async(
            self.contents_manager.get(path, content=False, type=self.file_type)
        )
        if (
            True
        ):  # not isinstance(self.contents_manager, (FileManagerMixin, AsyncFileManagerMixin)):
            # we could not watch the file changes, so check if it is newer than last time it was saved
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
