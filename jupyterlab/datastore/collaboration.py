
import collections
import json

from tornado.ioloop import IOLoop
import typing

from .db import DatastoreDB
from .messages import (
    create_transaction_broadcast,
    create_stable_state_broadcast
)

if typing.TYPE_CHECKING:
    from .handler import CollaborationHandler


class Collaboration:
    def __init__(self, collaboration_id, db_file, friendly_name=None) -> None:
        self.id = collaboration_id
        self.db = DatastoreDB(f'collab-{collaboration_id}', db_file)
        self.friendly_name: str = friendly_name or collaboration_id

        self.last_serial: typing.Optional[int] = None

        self._lastStable: int = -1

        self._handlers: "typing.Set[CollaborationHandler]" = set()
        self._dangling_handlers: "typing.Dict[CollaborationHandler, object]" = {}
        self._serials: "typing.Dict[CollaborationHandler, int]" = collections.defaultdict(lambda: -1)

    def add_client(self, handler) -> None:
        self._handlers.add(handler)

    def remove_client(self, handler) -> None:
        self._handlers.remove(handler)
        if handler in self._serials:
            del self._serials[handler]

    @property
    def has_clients(self) -> bool:
        return bool(self._handlers)

    def close(self) -> None:
        self.db.close()
        for h in self._handlers:
            h.close(1001)
        self._handlers = set()

    def broadcast_transactions(self, source: "CollaborationHandler", transactions, serials) -> None:
        message = create_transaction_broadcast(transactions, serials)
        self.broadcast_message(message, source)
        self.last_serial = max(serials.values())
        self.update_serial(source, self.last_serial)

    def broadcast_message(self, message, exclude_handler: "typing.Optional[CollaborationHandler]" = None) -> None:
        for handler in self._handlers:
            if handler is exclude_handler or not handler.history_inited:
                continue
            handler.write_message(json.dumps(message))

    def mark_dangling(self, handler: "CollaborationHandler", timeout, callback) -> None:
        loop = IOLoop.current()
        timer = loop.add_timeout(loop.time() + timeout, callback)
        self._dangling_handlers[handler] = timer

    def forget_dangling(self, handler: "CollaborationHandler") -> None:
        timer = self._dangling_handlers.pop(handler)
        loop = IOLoop.current()
        loop.remove_timeout(timer)

    def is_dangling(self, handler: "CollaborationHandler") -> bool:
        return handler in self._dangling_handlers

    def update_serial(self, handler: "CollaborationHandler", serial) -> None:
        # We can never go back:
        print(f"Update serial {handler} {id(handler)}")
        print(self._serials)
        self._serials[handler] = max(serial, self._serials[handler])
        stable = min(
            self._serials[handler]
            for handler in self._handlers
            if handler.history_inited
        )
        if stable > self._lastStable:
            if len(self._serials) > 1:
                msg = create_stable_state_broadcast(stable)
                self.broadcast_message(msg)
            self._lastStable = stable
