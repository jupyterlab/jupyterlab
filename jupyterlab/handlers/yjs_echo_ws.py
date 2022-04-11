"""Echo WebSocket handler for real time collaboration with Yjs"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import asyncio
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import y_py as Y
from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.services.contents.fileio import (
    AsyncFileManagerMixin,
    FileManagerMixin,
)
from jupyter_server.utils import ensure_async
from tornado import web
from tornado.websocket import WebSocketHandler
from watchfiles import awatch

from .yutils import YMessageType, create_sync_step1_message, process_sync_message

# See compatibility note on `group` keyword in https://docs.python.org/3/library/importlib.metadata.html#entry-points
if sys.version_info < (3, 10):
    from importlib_metadata import entry_points
else:
    from importlib.metadata import entry_points

YDOCS = {}
for ep in entry_points(group="jupyter_ydoc"):
    YDOCS.update({ep.name: ep.load()})

YFILE = YDOCS["file"]

ROOMS = {}

# The y-protocol defines messages types that just need to be propagated to all other peers.
# Here, we define some additional messageTypes that the server can interpret.
# Messages that the server can't interpret should be broadcasted to all other clients.


class YjsRoom:
    def __init__(self, type):
        self.type = type
        self.clients = []
        self.cleaner = None
        self.watcher = None
        self.ydoc = YDOCS.get(type, YFILE)(self)


class YjsEchoWebSocket(WebSocketHandler, JupyterHandler):

    saving_document: Optional[asyncio.Task]

    # Override max_message size to 1GB
    @property
    def max_message_size(self):
        return 1024 * 1024 * 1024

    @property
    def room(self):
        return ROOMS.get(self.room_id)

    @room.setter
    def room(self, value):
        ROOMS[self.room_id] = value

    async def get(self, *args, **kwargs):
        if self.get_current_user() is None:
            self.log.warning("Couldn't authenticate WebSocket connection")
            raise web.HTTPError(403)
        return await super().get(*args, **kwargs)

    async def open(self, type_path):
        file_type, file_path = type_path.split(":", 1)
        self.saving_document = None
        self.id = str(uuid.uuid4())
        self.room_id = file_path
        self.room = self.room or YjsRoom(file_type)
        self.room.clients.append(self)

        # cancel the deletion of the room if it was scheduled
        if self.room.cleaner is not None:
            self.room.cleaner.cancel()

        if not self.room.ydoc.initialized:
            file_path = self.room_id
            model = await ensure_async(self.contents_manager.get(file_path))
            self.last_saved = model["last_modified"]
            # check again if initialized, because loading the file can be async
            if not self.room.ydoc.initialized:
                self.room.ydoc.source = model["content"]
                self.room.ydoc.initialized = True
                # can only watch file changes if local file system
                # if/when https://github.com/jupyter-server/jupyter_server/pull/783 gets in,
                # we will check for a contents manager ability to watch file changes
                if isinstance(self.contents_manager, (FileManagerMixin, AsyncFileManagerMixin)):
                    self.room.watcher = asyncio.create_task(self.watch_file(file_path))
                # save the document when changed
                self.room.ydoc.observe(self.maybe_save_document)
        # send our state
        state = Y.encode_state_vector(self.room.ydoc.ydoc)
        message = create_sync_step1_message(state)
        self.write_message(message, binary=True)

    async def watch_file(self, path):
        abs_path = str(Path(path).resolve())

        def filter(change, path):
            return path == abs_path

        async for _ in awatch(abs_path, watch_filter=filter):
            model = await ensure_async(self.contents_manager.get(path, content=False))
            # do nothing if the file was saved by us
            if model["last_modified"] != self.last_saved:
                model = await ensure_async(self.contents_manager.get(path))
                self.room.ydoc.source = model["content"]

    def on_message(self, message):
        if message[0] == YMessageType.RENAME_SESSION:
            # The client moved the document to a different location. After receiving this message, we make the current document available under a different url.
            # The other clients are automatically notified of this change because the path is shared through the Yjs document as well.
            # move the room to a different entry and change the room_id of each connected client
            new_room_id = message[1:].decode("utf-8").split(":", 1)[1]
            ROOMS[new_room_id] = self.room
            del ROOMS[self.room_id]
            for client in self.room.clients:
                client.room_id = new_room_id
            # send rename acknowledge
            self.write_message(bytes([YMessageType.RENAME_SESSION, 1]), binary=True)
        elif self.room:
            if message[0] == YMessageType.SYNC:
                process_sync_message(self, self.room.ydoc.ydoc, message[1:])
            for client in [c for c in self.room.clients if c.id != self.id]:
                # broadcast to everybody else but me
                client.write_message(message, binary=True)

    def on_close(self) -> bool:
        # quit the room
        self.room.clients = [c for c in self.room.clients if c.id != self.id]
        if not self.room.clients:
            # keep the document for a while after every client disconnects
            self.room.cleaner = asyncio.create_task(self.clean_room())
        return True

    async def clean_room(self) -> None:
        await asyncio.sleep(60)
        self.room.watcher.cancel()
        self.room.ydoc.unobserve()
        del ROOMS[self.room_id]

    def maybe_save_document(self, event):
        if self.saving_document is not None and not self.saving_document.done():
            # the document is being saved, cancel that
            self.saving_document.cancel()
            self.saving_document = None
        self.saving_document = asyncio.create_task(self.save_document())

    async def save_document(self):
        # save after 1 second of inactivity to prevent too frequent saving
        await asyncio.sleep(1)
        path = self.room_id
        model = await ensure_async(self.contents_manager.get(path, content=False))
        if not isinstance(self.contents_manager, (FileManagerMixin, AsyncFileManagerMixin)):
            # we could not watch the file changes, so check if it is newer than last time it was saved
            last_modified = datetime.strptime(
                model["last_modified"], "%Y-%m-%dT%H:%M:%S.%fZ"
            ).astimezone(timezone.utc)
            if self.last_saved < last_modified:
                # file changed on disk, let's revert
                # FIXME: notify front-end?
                self.room.ydoc.source = model["content"]
                self.room.ydoc.dirty = False
                return
        model["format"] = "text"
        model["content"] = self.room.ydoc.source
        model = await ensure_async(self.contents_manager.save(model, path))
        self.last_saved = model["last_modified"]
        self.room.ydoc.dirty = False

    def check_origin(self, origin) -> bool:
        return True
