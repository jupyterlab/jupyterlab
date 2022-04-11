"""Echo WebSocket handler for real time collaboration with Yjs"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import asyncio
import sys
import uuid
from enum import IntEnum
from pathlib import Path

import pkg_resources
from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.services.contents.fileio import (
    AsyncFileManagerMixin,
    FileManagerMixin,
)
from jupyter_server.utils import ensure_async
from tornado import web
from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler
from watchfiles import awatch

from .yutils import read_sync_message

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


class ServerMessageType(IntEnum):
    # The client moved the document to a different location. After receiving this message, we make the current document available under a different url.
    # The other clients are automatically notified of this change because the path is shared through the Yjs document as well.
    RENAME_SESSION = 127


class YjsRoom:
    def __init__(self, type, handler):
        self.type = type
        self.clients = {}
        self.initialized = False
        self.cleaner = None
        self.watcher = None
        self.ydoc = YDOCS.get(type, YFILE)(handler)

    @property
    def source(self):
        return self.ydoc.source

    @source.setter
    def source(self, value):
        self.ydoc.source = value


class YjsEchoWebSocket(WebSocketHandler, JupyterHandler):

    # Override max_message size to 1GB
    @property
    def max_message_size(self):
        return 1024 * 1024 * 1024

    async def get(self, *args, **kwargs):
        if self.get_current_user() is None:
            self.log.warning("Couldn't authenticate WebSocket connection")
            raise web.HTTPError(403)
        return await super().get(*args, **kwargs)

    async def open(self, type_path):
        # print("[YJSEchoWS]: open", type_path)
        file_type, path = type_path.split(":", 1)
        self.id = str(uuid.uuid4())
        self.room_id = path
        room = ROOMS.get(self.room_id)
        if room is None:
            room = YjsRoom(file_type, self)
            ROOMS[self.room_id] = room
        room.clients[self.id] = (IOLoop.current(), self.hook_send_message, self)

        if room.cleaner is not None:
            room.cleaner.cancel()

        if not room.initialized:
            contents_manager = self.settings["contents_manager"]
            file_path = self.room_id
            model = await ensure_async(contents_manager.get(file_path))
            # check again if initialized, because loading the file can be async
            if not room.initialized:
                room.initialized = True
                room.source = model["content"]
                # can only watch file changes if local file system
                # if/when https://github.com/jupyter-server/jupyter_server/pull/783 gets in,
                # we will check for a contents manager ability to watch file changes
                if isinstance(contents_manager, (FileManagerMixin, AsyncFileManagerMixin)):
                    room.watcher = asyncio.create_task(self.watch_file(file_path))
        # Send SyncStep1 message (based on y-protocols)
        self.write_message(bytes([0, 0, 1, 0]), binary=True)

    async def watch_file(self, path):
        abs_path = str(Path(path).resolve())

        def filter(change, path):
            return path == abs_path

        contents_manager = self.settings["contents_manager"]
        room = ROOMS.get(self.room_id)
        async for _ in awatch(abs_path, watch_filter=filter):
            model = await ensure_async(contents_manager.get(path))
            room.source = model["content"]

    def on_message(self, message):
        # print("[YJSEchoWS]: message,", message)
        room_id = self.room_id
        room = ROOMS.get(room_id)
        if message[0] == ServerMessageType.RENAME_SESSION:
            # We move the room to a different entry and also change the room_id property of each connected client
            new_room_id = message[1:].decode("utf-8").split(":", 1)[1]
            for _, (_, _, client) in room.clients.items():
                client.room_id = new_room_id
            ROOMS.pop(room_id)
            ROOMS[new_room_id] = room
            # send rename acknowledge
            self.write_message(bytes([ServerMessageType.RENAME_SESSION, 1]), binary=True)
            # print("renamed room to " + new_room_id + ". Old room name was " + room_id)
        elif room:
            if message[0] == 0:  # sync message
                read_sync_message(self, room.ydoc.ydoc, message[1:])
            for client_id, (loop, hook_send_message, _) in room.clients.items():
                if self.id != client_id:
                    loop.add_callback(hook_send_message, message)

    def on_close(self):
        # print("[YJSEchoWS]: close", self.id, self.room_id)
        room = ROOMS.get(self.room_id)
        del room.clients[self.id]
        if not room.clients:
            # keep the document for a while after every client disconnects
            room.cleaner = asyncio.create_task(self.clean_room())

        return True

    def check_origin(self, origin):
        # print("[YJSEchoWS]: check origin")
        return True

    def hook_send_message(self, msg):
        self.write_message(msg, binary=True)

    async def clean_room(self):
        await asyncio.sleep(60)
        ROOMS[self.room_id].watcher.cancel()
        del ROOMS[self.room_id]
