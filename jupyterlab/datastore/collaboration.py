
import collections
import json

from tornado.ioloop import IOLoop

from .db import DatastoreDB
from .messages import (
    create_transaction_broadcast,
    create_stable_state_broadcast
)


class Collaboration:

    def __init__(self, collaboration_id, db_file, friendly_name=None):
        self.id = collaboration_id
        self.db = DatastoreDB(f'collab-{collaboration_id}', db_file)
        self.friendly_name = friendly_name or collaboration_id

        self.last_serial = None

        self._store_id_serial = 0
        self._lastStable = -1

        self._handlers = {}
        self._dangling_handlers = {}
        self._serials = collections.defaultdict(lambda: -1)

    def add_client(self, handler):
        self._store_id_serial += 1
        store_id = self._store_id_serial
        self._handlers[store_id] = handler
        return store_id

    def remove_client(self, handler):
        store_id = handler.store_id
        del self._handlers[store_id]
        del self._serials[store_id]

    @property
    def has_clients(self):
        return bool(self._handlers)

    def close(self):
        self.db.close()
        for h in self._handlers.values():
            h.close(1001)
        self._handlers = {}

    def broadcast_transactions(self, source, transactions, serials):
        message = create_transaction_broadcast(transactions, serials)
        self.broadcast_message(message, source)
        self.last_serial = max(serials.values())
        self.update_serial(source.store_id, self.last_serial)

    def broadcast_message(self, message, exclude_handler=None):
        for handler in self._handlers.values():
            if handler is exclude_handler or not handler.history_inited:
                continue
            handler.write_message(json.dumps(message))

    def mark_dangling(self, store_id, timeout, callback):
        loop = IOLoop.current()
        timer = loop.add_timeout(loop.time() + timeout, callback)
        self._dangling_handlers[store_id] = timer

    def forget_dangling(self, store_id):
        timer = self._dangling_handlers.pop(store_id)
        loop = IOLoop.current()
        loop.remove_timeout(timer)

    def is_dangling(self, store_id):
        return store_id in self._dangling_handlers

    def update_serial(self, store_id, serial):
        # We can never go back:
        self._serials[store_id] = max(serial, self._serials[store_id])
        stable = min(
            self._serials[handler.store_id]
            for handler in self._handlers.values()
            if handler.history_inited
        )
        if stable > self._lastStable:
            if len(self._serials) > 1:
                msg = create_stable_state_broadcast(stable)
                self.broadcast_message(msg)
            self._lastStable = stable
