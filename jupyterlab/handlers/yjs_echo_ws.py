"""Echo WebSocket handler for real time collaboration with Yjs"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import sys
import uuid
from enum import IntEnum

import y_py as Y
from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.utils import ensure_async
from tornado import web
from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler

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
    def __init__(self, type):
        self.type = type
        self.clients = {}
        self.initialized = False
        self.ydoc = YDOCS.get(type, YFILE)()

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
        type, path = type_path.split(":", 1)
        self.id = str(uuid.uuid4())
        self.room_id = path
        room = ROOMS.get(self.room_id)
        if room is None:
            room = YjsRoom(type)
            ROOMS[self.room_id] = room
        room.clients[self.id] = (IOLoop.current(), self.hook_send_message, self)
        if not room.initialized:
            model = await ensure_async(self.settings["contents_manager"].get(self.room_id))
            # check again if initialized, because loading the file can be async
            if not room.initialized:
                room.source = model["content"]
                room.initialized = True
        # Send SyncStep1 message (based on y-protocols)
        self.write_message(bytes([0, 0, 1, 0]), binary=True)

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
        # print("[YJSEchoWS]: close")
        room = ROOMS.get(self.room_id)
        room.clients.pop(self.id)
        if not room.clients:
            ROOMS.pop(self.room_id)
            # print("[YJSEchoWS]: close room " + self.room_id)

        return True

    def check_origin(self, origin):
        # print("[YJSEchoWS]: check origin")
        return True

    def hook_send_message(self, msg):
        self.write_message(msg, binary=True)


message_yjs_sync_step1 = 0
message_yjs_sync_step2 = 1
message_yjs_update = 2


def read_sync_step1(handler, doc, encoded_state_vector):
    message = Y.encode_state_as_update(doc, encoded_state_vector)
    message = bytes([0, message_yjs_sync_step2] + write_var_uint(len(message)) + message)
    handler.write_message(message, binary=True)


def read_sync_step2(doc, update):
    try:
        Y.apply_update(doc, update)
    except Exception:
        raise RuntimeError("Caught error while handling a Y update")


def read_sync_message(handler, doc, message):
    message_type = message[0]
    message = message[1:]
    if message_type == message_yjs_sync_step1:
        for msg in get_message(message):
            read_sync_step1(handler, doc, msg)
    elif message_type == message_yjs_sync_step2:
        for msg in get_message(message):
            read_sync_step2(doc, msg)
    elif message_type == message_yjs_update:
        for msg in get_message(message):
            read_sync_step2(doc, msg)
    else:
        raise RuntimeError("Unknown message type")


def write_var_uint(num):
    res = []
    while num > 127:
        res += [128 | (127 & num)]
        num >>= 7
    res += [num]
    return res


def get_message(message):
    length = len(message)
    i0 = 0
    while True:
        msg_len = 0
        i = 0
        while True:
            byte = message[i0]
            msg_len += (byte & 127) << i
            i += 7
            i0 += 1
            length -= 1
            if byte < 128:
                break
        i1 = i0 + msg_len
        msg = message[i0:i1]
        length -= msg_len
        yield msg
        if length <= 0:
            if length < 0:
                raise RuntimeError("Y protocol error")
            break
        i0 = i1
