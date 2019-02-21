
import collections
import json

from .db import DatastoreDB
from .messages import (
    create_transaction_broadcast,
    create_stable_state_broadcast
)

class Session:

    def __init__(self, session_id, db_file):
        self.id = session_id
        self.db = DatastoreDB(session_id, db_file)
        self.handlers = []
        self._dangling_handlers = set()
        self._store_id_serial = 0
        self.last_serial = None
        self._serials = collections.defaultdict(lambda: -1)
        self._lastStable = -1

    def create_store_id(self):
        self._store_id_serial += 1
        return self._store_id_serial

    def close(self):
        self.db.close()
        for h in self.handlers:
            h.close(1001)
        self.handlers = []

    def broadcast_transactions(self, source, transactions, serials):
        serials = tuple(serials)
        message = create_transaction_broadcast(transactions, serials)
        self.broadcast_message(message, source)
        self.last_serial = max(serials)

    def broadcast_message(self, message, exclude_handler=None):
        for handler in self.handlers:
            if handler is exclude_handler:
                continue
            handler.write_message(json.dumps(message))

    def mark_dangling(self, store_id):
        self._dangling_handlers.add(store_id)

    def forget_dangling(self, store_id):
        self._dangling_handlers.remove(store_id)

    def is_dangling(self, store_id):
        return store_id in self._dangling_handlers

    def update_serial(self, store_id, serial):
        self._serials[store_id] = serial
        stable = min(
            self._serials[h.store_id]
            for h in self.handlers
            if h.store_id is not None
        )
        if stable > self._lastStable:
            if len(self._serials) > 1:
                msg = create_stable_state_broadcast(stable)
                self.broadcast_message(msg)
            self._lastStable = stable
