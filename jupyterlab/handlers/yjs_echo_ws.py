"""Echo WebSocket handler for real time collaboration with Yjs"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import time
import uuid
from enum import IntEnum

import pkg_resources
import y_py as Y
from jupyter_server.base.handlers import JupyterHandler
from tornado import web
from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler

YDOCS = {}
for ep in pkg_resources.iter_entry_points(group="jupyter_ydoc"):
    YDOCS.update({ep.name: ep.load()})

YFILE = YDOCS["file"]

ROOMS = {}

# The y-protocol defines messages types that just need to be propagated to all other peers.
# Here, we define some additional messageTypes that the server can interpret.
# Messages that the server can't interpret should be broadcasted to all other clients.


class ServerMessageType(IntEnum):
    # The client is asking for a lock. Should return a lock-identifier if one is available.
    ACQUIRE_LOCK = 127
    # The client is asking to release a lock to make it available to other users again.
    RELEASE_LOCK = 126
    # The client is asking to retrieve the initial state of the Yjs document. Return an empty buffer when nothing is available.
    REQUEST_INITIALIZED_CONTENT = 125
    # The client retrieved an empty "initial content" and generated the initial state of the document after acquiring a lock. Store this.
    PUT_INITIALIZED_CONTENT = 124
    # The client moved the document to a different location. After receiving this message, we make the current document available under a different url.
    # The other clients are automatically notified of this change because the path is shared through the Yjs document as well.
    RENAME_SESSION = 123


class YjsRoom:
    def __init__(self, type):
        self.type = type
        self.lock = None
        self.timeout = None
        self.lock_holder = None
        self.clients = {}
        self.content = bytes([])
        self.ydoc = YDOCS.get(type, YFILE)()

    def get_source(self):
        return self.ydoc.source


class YjsEchoWebSocket(WebSocketHandler, JupyterHandler):

    # Override max_message size to 1GB
    @property
    def max_message_size(self):
        return 1024 * 1024 * 1024

    async def get(self, *args, **kwargs):
        if self.get_current_user() is None:
            self.log.warninging("Couldn't authenticate WebSocket connection")
            raise web.HTTPError(403)
        return await super().get(*args, **kwargs)

    def open(self, type_path):
        # print("[YJSEchoWS]: open", type_path)
        type, path = type_path.split(":", 1)
        self.id = str(uuid.uuid4())
        self.room_id = path
        room = ROOMS.get(self.room_id)
        if room is None:
            room = YjsRoom(type)
            ROOMS[self.room_id] = room
        room.clients[self.id] = (IOLoop.current(), self.hook_send_message, self)
        # Send SyncStep1 message (based on y-protocols)
        self.write_message(bytes([0, 0, 1, 0]), binary=True)

    def on_message(self, message):
        # print("[YJSEchoWS]: message,", message)
        room_id = self.room_id
        room = ROOMS.get(room_id)
        if message[0] == ServerMessageType.ACQUIRE_LOCK:
            now = int(time.time())
            if room.lock is None or now - room.timeout > (
                10 * len(room.clients)
            ):  # no lock or timeout
                room.lock = now
                room.timeout = now
                room.lock_holder = self.id
                # print('Acquired new lock:', room.lock)
                # return acquired lock
                self.write_message(
                    bytes([ServerMessageType.ACQUIRE_LOCK])
                    + room.lock.to_bytes(4, byteorder="little"),
                    binary=True,
                )

            elif room.lock_holder == self.id:
                # print('Update lock:', room.timeout)
                room.timeout = now

        elif message[0] == ServerMessageType.RELEASE_LOCK:
            releasedLock = int.from_bytes(message[1:], byteorder="little")
            # print("trying release lock:", releasedLock)
            if room.lock == releasedLock:
                # print('released lock:', room.lock)
                room.lock = None
                room.timeout = None
                room.lock_holder = None
        elif message[0] == ServerMessageType.REQUEST_INITIALIZED_CONTENT:
            # print("client requested initial content")
            self.write_message(
                bytes([ServerMessageType.REQUEST_INITIALIZED_CONTENT]) + room.content, binary=True
            )
        elif message[0] == ServerMessageType.PUT_INITIALIZED_CONTENT:
            # print("client put initialized content")
            room.content = message[1:]
        elif message[0] == ServerMessageType.RENAME_SESSION:
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
    message = bytes([message_yjs_sync_step2] + write_var_uint(len(message)) + message)
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
