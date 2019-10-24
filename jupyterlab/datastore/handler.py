import json
import uuid
import typing

from notebook.base.handlers import IPythonHandler
from notebook.base.zmqhandlers import WebSocketMixin
from tornado import gen, web
from tornado.websocket import WebSocketHandler

from .messages import (
    create_error_reply,
    create_history_reply,
    create_permissions_reply,
    create_serial_reply,
    create_transaction_reply,
    create_transactions_ack,
)
from .collaboration import Collaboration


def filter_duplicates(transactions, is_duplicate):
    for (t, d) in zip(transactions, is_duplicate):
        if not d:
            yield t


class DefaultDatastoreAuth:
    """Default implementation of a datastore authenticator."""

    def check_permissions(self, user, collaboration_id, action) -> bool:
        """Whether a specific user can perform an action for a given collaboration.

        This default implementation always returns True.
        """
        return True


class DatastoreHandler(IPythonHandler):
    @property
    def auth(self) -> DefaultDatastoreAuth:
        return self.settings.setdefault("auth", DefaultDatastoreAuth())

    collaborations: "typing.Dict[int, Collaboration]" = {}


class CollaborationsManagerHandler(DatastoreHandler):
    @web.authenticated
    def get(self, *args, **kwargs) -> None:
        # For unqualified GET, list current sessions we have read access to
        collaborations = dict({
            key: dict(id=key, friendlyName=c.friendly_name)
            for key, c in self.collaborations.items()
            if self.auth.check_permissions(self.current_user, key, "r")
        })
        self.finish(json.dumps(dict(collaborations=collaborations)))


class WSBaseHandler(WebSocketMixin, WebSocketHandler, DatastoreHandler):
    """Base class for websockets reusing jupyter code"""

    def set_default_headers(self):
        """
        Undo the set_default_headers in IPythonHandler which doesn't make
        sense for websockets
        """
        pass

    def pre_get(self) -> None:
        """Run before finishing the GET request

        Extend this method to add logic that should fire before
        the websocket finishes completing.
        """
        # authenticate the request before opening the websocket
        if self.get_current_user() is None:
            self.log.warning("Couldn't authenticate WebSocket connection")
            raise web.HTTPError(403)

    @gen.coroutine
    def get(self, *args, **kwargs):
        # pre_get can be a coroutine in subclasses
        # assign and yield in two step to avoid tornado 3 issues
        res = self.pre_get()
        yield gen.maybe_future(res)
        yield super(WSBaseHandler, self).get(*args, **kwargs)

    def get_compression_options(self):
        return self.settings.get("websocket_compression_options", None)


class CollaborationHandler(WSBaseHandler):
    """Request handler for the datastore API"""

    def initialize(self) -> None:
        self.log.info("Initializing datastore connection %s", self.request.path)
        self.collaboration: typing.Optional[Collaboration] = None
        self.collaboration_id = None
        self.store_transaction_serial = -1
        self.history_inited = False

    @property
    def datastore_file(self):
        return self.settings.setdefault("datastore_file", ":memory:")

    @property
    def rtc_recovery_timeout(self):
        return self.settings.get("rtc_recovery_timeout", 120)

    def open(self, collaboration_id=None) -> None:
        self.log.info("Datastore open called...")

        if collaboration_id is None:
            self.log.warning("No collaboration id specified")
            collaboration_id = uuid.uuid4()
        self.collaboration_id = collaboration_id

        if self.collaborations.get(collaboration_id, None) is None:
            self.log.info("Created new collaboration %s" % collaboration_id)
            self.collaborations[collaboration_id] = Collaboration(
                collaboration_id, self.datastore_file
            )
        self.collaboration = self.collaborations[collaboration_id]

        self.collaboration.add_client(self)

        super(CollaborationHandler, self).open()
        self.log.info("Opened datastore websocket")

    def cleanup_closed(self) -> None:
        """Cleanup after clean close, or after recovery timeout on unclean close.
        """
        assert self.collaboration
        # Unmark as dangling if needed:
        try:
            self.collaboration.forget_dangling(self)
        except KeyError:
            pass

        if self.datastore_file != ":memory:" and not self.collaboration.has_clients:
            self.collaboration.close()
            self.collaboration = None
            assert self.collaboration_id
            del self.collaborations[self.collaboration_id]

    def on_close(self) -> None:
        assert self.collaboration
        clean_close = self.close_code in (1000, 1001)
        self.collaboration.remove_client(self)
        if clean_close:
            self.cleanup_closed()
        else:
            # Un-clean close after a store was established
            self.collaboration.mark_dangling(
                self, self.rtc_recovery_timeout, self.cleanup_closed
            )

        super(CollaborationHandler, self).on_close()
        self.log.info("Closed datastore websocket")

    def send_error_reply(self, parent_msg_id, reason) -> None:
        msg = create_error_reply(parent_msg_id, reason)
        self.log.error(reason)
        self.write_message(json.dumps(msg))

    def check_permissions(self, action):
        return self.auth.check_permissions(
            self.current_user, self.collaboration_id, action
        )

    def on_message(self, message) -> None:
        msg = json.loads(message)
        msg_type = msg.pop("msgType", None)
        msg_id = msg.pop("msgId", None)
        reply = None
        assert self.collaboration

        self.log.info(
            "Received datastore message %s: \n%s"
            % (msg_type, json.dumps(msg, indent=2))
        )

        if msg_type == "transaction-broadcast":
            if not self.check_permissions("w"):
                return self.send_error_reply(
                    msg_id,
                    "Permisson error: Cannot write transactions to current collaboration.",
                )

            # Get the transactions:
            content = msg.pop("content", None)
            if content is None:
                self.log.warning("Malformed transaction broadcast message received")
                return
            transactions = content.pop("transactions", None)
            if transactions is None:
                self.log.warning("Malformed transaction broadcast message received")
                return

            # Ensure that transaction serials increment as expected:
            for t in transactions:
                if t["serial"] != self.store_transaction_serial + 1:
                    # TODO: ! Missing a transaction, recover !
                    raise ValueError(
                        "Missing transaction %d from %r"
                        % (self.store_transaction_serial, self)
                    )
                self.store_transaction_serial += 1

            # Check for any duplicates before adding
            is_duplicate = self.collaboration.db.has_transactions(
                t["id"] for t in transactions
            )

            # Add to transaction store, generating a central serial for each
            serials = self.collaboration.db.add_transactions(transactions)

            # Create an acknowledgment message to the source
            reply = create_transactions_ack(msg_id, transactions, serials)
            self.write_message(json.dumps(reply))

            # Broadcast the tranasctions to all other stores
            # First, filter away duplicates
            filtered = filter_duplicates(transactions, is_duplicate)
            self.collaboration.broadcast_transactions(self, filtered, serials)

        elif msg_type == "history-request":
            if not self.check_permissions("r"):
                return self.send_error_reply(
                    msg_id,
                    "Permisson error: Cannot access collaboration: %s"
                    % (self.collaboration_id,),
                )
            content = msg.pop("content", {})
            checkpoint_id = content.pop("checkpointId", None)
            history = self.collaboration.db.history(checkpoint_id)
            reply = create_history_reply(
                msg_id, tuple(history.transactions), history.state
            )
            self.write_message(json.dumps(reply))
            self.history_inited = True

        elif msg_type == "transaction-request":
            if not self.check_permissions("r"):
                return self.send_error_reply(
                    msg_id,
                    "Permisson error: Cannot access collaboration: %s"
                    % (self.collaboration_id,),
                )
            content = msg.pop("content", None)
            if content is None:
                return
            transactionIds = content.pop("transactionIds", [])
            transactions = tuple(self.collaboration.db.get_transactions(transactionIds))
            reply = create_transaction_reply(msg_id, transactions)
            self.write_message(json.dumps(reply))

        elif msg_type == "serial-request":
            if not self.check_permissions("r"):
                return self.send_error_reply(
                    msg_id,
                    "Permisson error: Cannot access collaboration: %s"
                    % (self.collaboration_id,),
                )
            content = msg.pop("content", None)
            if content is None:
                return
            serials = content.pop("serials", [])
            transactions = tuple(self.collaboration.db.get_serials(serials))
            reply = create_serial_reply(msg_id, transactions)
            self.write_message(json.dumps(reply))

        elif msg_type == "permissions-request":
            reply = create_permissions_reply(
                msg_id, self.check_permissions("r"), self.check_permissions("w")
            )
            self.write_message(json.dumps(reply))

        elif msg_type == "serial-update":
            content = msg.pop("content", None)
            if content is None:
                return
            serial = content.pop("serial", None)
            if serial is not None:
                self.collaboration.update_serial(self, serial)


# The path for lab build.
# TODO: Is this a reasonable path?
collaboration_path = r"/lab/api/datastore/(?P<collaboration_id>.+)(?:[^/])/?"
datastore_rest_path = r"/lab/api/datastore/?"
