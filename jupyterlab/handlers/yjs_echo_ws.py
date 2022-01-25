"""Echo WebSocket handler for real time collaboration with Yjs"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import uuid
import time

from tornado.ioloop import IOLoop
from jupyter_server.base.handlers import JupyterHandler
from tornado import web
from tornado.websocket import WebSocketHandler
from enum import IntEnum

## The y-protocol defines messages types that just need to be propagated to all other peers.
## Here, we define some additional messageTypes that the server can interpret.
## Messages that the server can't interpret should be broadcasted to all other clients.

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
    def __init__(self):
        self.lock = None
        self.lock_holder = None
        self.clients = {}
        self.content = bytes([])


class YjsEchoWebSocket(WebSocketHandler, JupyterHandler):
    rooms = {}

    # Override max_message size to 1GB
    @property
    def max_message_size(self):
        return 1024 * 1024 * 1024

    async def get(self, *args, **kwargs):
        if self.get_current_user() is None:
            self.log.warning("Couldn't authenticate WebSocket connection")
            raise web.HTTPError(403)
        return await super().get(*args, **kwargs)

    def open(self, guid):
        #print("[YJSEchoWS] OPEN:", guid)
        cls = self.__class__
        self.id = str(uuid.uuid4())
        self.room_id = guid
        room = cls.rooms.get(self.room_id)
        if room is None:
            room = YjsRoom()
            cls.rooms[self.room_id] = room
        room.clients[self.id] = ( IOLoop.current(), self.hook_send_message, self )
        # Send SyncStep1 message (based on y-protocols)
        self.write_message(bytes([0, 0, 1, 0]), binary=True)

    def on_message(self, message):
        #print("[YJSEchoWS] MESSAGE:")
        #print("[YJSEchoWS] MESSAGE: message", message)
        cls = self.__class__
        room_id = self.room_id
        room = cls.rooms.get(room_id)

        if message[0] == ServerMessageType.ACQUIRE_LOCK:
            #print("[YJSEchoWS] ACQUIRE_LOCK:", self.id)
            now = int(time.time())
            
            if room.lock is None or now - room.lock > 25 : # no lock or timeout
                #print("[YJSEchoWS] ACQUIRE_LOCK: Acquired new lock", room.lock)
                room.lock = now
                room.lock_holder = self.id
                self.write_message(bytes([ServerMessageType.ACQUIRE_LOCK]) + room.lock.to_bytes(4, byteorder = 'little'), binary=True)

        elif message[0] == ServerMessageType.RELEASE_LOCK:
            #print("[YJSEchoWS] RELEASE_LOCK:", self.id)
            releasedLock = int.from_bytes(message[1:], byteorder = 'little')
            if room.lock == releasedLock:
                #print("[YJSEchoWS] RELEASE_LOCK: released lock", room.lock)
                room.lock = None
                room.lock_holder = None

        elif message[0] == ServerMessageType.REQUEST_INITIALIZED_CONTENT:
            #print("[YJSEchoWS] REQUEST_INITIALIZED_CONTENT:", self.id)
            self.write_message(bytes([ServerMessageType.REQUEST_INITIALIZED_CONTENT]) + room.content, binary=True)

        elif message[0] == ServerMessageType.PUT_INITIALIZED_CONTENT:
            #print("[YJSEchoWS] PUT_INITIALIZED_CONTENT:", self.id)
            room.content = message[1:]

        elif message[0] == ServerMessageType.RENAME_SESSION:
            # We move the room to a different entry and also change the room_id property of each connected client
            new_room_id = message[1:].decode("utf-8")
            #print("[YJSEchoWS] RENAME_SESSION: renamed room to " + new_room_id + ". Old room name was " + room_id)

            for client_id, (loop, hook_send_message, client) in room.clients.items() :
                client.room_id = new_room_id

            cls.rooms.pop(room_id)
            cls.rooms[new_room_id] = room
            
        elif room:
            for client_id, (loop, hook_send_message, client) in room.clients.items() :
                if self.id != client_id :
                    loop.add_callback(hook_send_message, message)

    def on_close(self):
        #print("[YJSEchoWS] CLOSE:", self.id)
        cls = self.__class__
        room = cls.rooms.get(self.room_id)
        room.clients.pop(self.id)

        if room.lock_holder == self.id:
            #print("[YJSEchoWS] CLOSE: release lock ", room.lock)
            room.lock = None
            room.lock_holder = None
            

        if len(room.clients) == 0 :
            #print("[YJSEchoWS] CLOSE: close room " + self.room_id)
            cls.rooms.pop(self.room_id)

        return True

    def check_origin(self, origin):
        #print("[YJSEchoWS] CHECK ORIGIN:")
        return True

    def hook_send_message(self, msg):
        self.write_message(msg, binary=True)
