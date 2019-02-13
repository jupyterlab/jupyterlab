
from .db import DatastoreDB

class Session:

    def __init__(self, session_id, db_file):
        self.id = session_id
        self.db = DatastoreDB(session_id, db_file)
        self.handlers = []
        self._store_id_serial = 0

    def create_store_id(self):
        self._store_id_serial += 1
        return self._store_id_serial

    def close(self):
        self.db.close()
        self.handlers = []

    def broadcast(self, source, message):
        for handler in self.handlers:
            if handler is source:
                continue
            handler.write_message(message)
