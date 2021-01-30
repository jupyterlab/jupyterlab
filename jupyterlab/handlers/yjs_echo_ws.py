import uuid
import json

from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler

class YJSEchoWS(WebSocketHandler):
    rooms = {}

    def open(self, guid):
        print("[YJSEchoWS]: open", self.open_args)
        print("[YJSEchoWS]: open", self.open_kwargs)
        cls = self.__class__
        self.id = str(uuid.uuid4())
        self.room_id = guid
        clients = cls.rooms.get(self.room_id, None)
        
        if clients :
            clients[self.id] = ( IOLoop.current(), self.hook_send_message )
        else :
            clients = { self.id: ( IOLoop.current(), self.hook_send_message )}
            self.write_message( bytes(5), binary=True )
        
        cls.rooms[self.room_id] = clients
    
    def on_message(self, message):
        print("[YJSEchoWS]: message, ", message)
        cls = self.__class__
        clients = cls.rooms.get(self.room_id, None)
        if clients :
            for client_id, (loop, hook_send_message) in clients.items() :
                if self.id != client_id :
                    loop.add_callback(hook_send_message, message)

    def on_close(self):
        print("[YJSEchoWS]: close")
        cls = self.__class__
        clients = cls.rooms.get(self.room_id, None)
        if clients :
            clients.pop(self.id)
        
        if len(cls.rooms) == 0 :
            cls.rooms.pop(self.room_id)
        else :
            cls.rooms[self.room_id] = clients

        return True
    
    def check_origin(self, origin):
        print("[YJSEchoWS]: check origin")
        return True
    
    def hook_send_message(self, msg):
        self.write_message(msg, binary=True)