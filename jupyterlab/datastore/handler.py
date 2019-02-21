
from itertools import tee
import json
import os
import uuid

from notebook.base.handlers import IPythonHandler
from notebook.base.zmqhandlers import WebSocketMixin
from tornado import gen, web
from tornado.concurrent import Future
from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler

from .messages import (
    create_error_reply,
    create_history_reply,
    create_permissions_reply,
    create_serial_reply,
    create_storeid_reply,
    create_transaction_reply,
    create_transactions_ack
)
from .session import Session


def filter_duplicates(transactions, serials, is_duplicate):
    for (t, s, d) in zip(transactions, serials, is_duplicate):
        if not d:
            yield (t, s)


class WSBaseHandler(WebSocketMixin, WebSocketHandler, IPythonHandler):
    """Base class for websockets reusing jupyter code"""

    def set_default_headers(self):
        """Undo the set_default_headers in IPythonHandler

        which doesn't make sense for websockets
        """
        pass

    def pre_get(self):
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
        super(WSBaseHandler, self).get(*args, **kwargs)

    def get_compression_options(self):
        return self.settings.get('websocket_compression_options', None)


class DefaultDatastoreAuth:
    """Default implementation of a datastore authenticator."""

    def check_permissions(self, user, session_id, action):
        """Whether a specific user can perform an action for a given session.

        This default implementation always returns True.
        """
        return True


class DatastoreHandler(WSBaseHandler):
    """Request handler for the datastore API"""

    @property
    def auth(self):
        return self.settings.setdefault('auth', DefaultDatastoreAuth())

    sessions = {} # map of RTC session id -> session

    def initialize(self):
        self.log.info("Initializing datastore connection %s", self.request.path)
        self.session = None
        self.session_id = None
        self.store_id = None
        self.store_transaction_serial = -1

    @property
    def datastore_file(self):
        return self.settings.setdefault('datastore_file', ':memory:')

    @gen.coroutine
    def pre_get(self):
        # authenticate first
        super(DatastoreHandler, self).pre_get()

        self.store_id = self.get_query_argument('storeId', None)
        # TODO: Check if store id supplied, if so, check if already open
        if self.store_id is not None:
            # TODO: Temporary minimal reaction:
            self.log.warning("Trying to reopen store that is already connected")
            raise web.HTTPError(400)

            # If so, give the message loop time to process any
            # transactions that were sent before disconnect,
            # before attempting recovery.
            #
            # TODO: Make a future that can be resolved on close
            future = None
            def give_up():
                """Don't wait forever for close event"""
                if future.done():
                    return
                future.set_result({})
            loop = IOLoop.current()
            loop.add_timeout(loop.time() + self.rtc_recovery_wait, give_up)
            # actually wait for it
            yield future

    def open(self, session_id=None):
        self.log.info('Datastore open called...')

        if session_id is None:
            self.log.warning("No session id specified")
            session_id = uuid.uuid4()
        self.session_id = session_id

        if self.sessions.get(self.session_id, None) is None:
            self.sessions[self.session_id] = Session(self.session_id, self.datastore_file)
        self.session = self.sessions[self.session_id]

        self.session.handlers.append(self)

        super(DatastoreHandler, self).open()
        self.log.info('Opened datastore websocket')

    def cleanup_closed(self):
        """Cleanup after clean close, or after recovery timeout on unclean close.
        """
        # Unmark as dangling if needed:
        try:
            self.session.forget_dangling(self.store_id)
        except KeyError:
            pass

        if self.datastore_file != ':memory:' and not self.session.handlers:
            self.session.close()
            self.session = None
            del self.sessions[self.session_id]

    def on_close(self):
        clean_close = self.close_code in (1000, 1001)
        self.session.handlers.remove(self)
        if clean_close:
            self.cleanup_closed()
        elif self.store_id:
            # Un-clean close after a store was established
            self.session.mark_dangling(self.store_id)
            loop = IOLoop.current()
            loop.add_timeout(loop.time() + self.rtc_recovery_timeout, self.cleanup_closed)

        super(DatastoreHandler, self).on_close()
        self.log.info('Closed datastore websocket')

    def send_error_reply(self, parent_msg_id, reason):
        msg = create_error_reply(parent_msg_id, reason)
        self.log.error(reason)
        self.write_message(json.dumps(msg))

    def check_permissions(self, action):
        self.log.info(self.current_user)
        return self.auth.check_permissions(self.current_user, self.session_id, action)

    def on_message(self, message):
        msg = json.loads(message)
        msg_type = msg.pop('msgType', None)
        msg_id = msg.pop('msgId', None)
        reply = None

        self.log.info('Received datastore message %s: \n%r' % (msg_type, msg))

        if msg_type == 'transaction-broadcast':
            if not self.check_permissions('w'):
                return self.send_error_reply(
                    msg_id,
                    'Permisson error: Cannot write transactions to current session.'
                )

            # Get the transactions:
            content = msg.pop('content', None)
            if content is None:
                self.log.warning('Malformed transaction broadcast message received')
                return
            transactions = content.pop('transactions', None)
            if transactions is None:
                self.log.warning('Malformed transaction broadcast message received')
                return

            # Ensure that transaction serials increment as expected:
            for t in transactions:
                if t['content']['serial'] != self.store_transaction_serial + 1:
                    # TODO: ! Missing a transaction, recover !
                    raise ValueError('Missing transaction %d from %r' % (
                        self.store_transaction_serial, self.store_id
                    ))
                self.store_transaction_serial += 1

            # Check for any duplicates before adding
            is_duplicate = self.session.db.has_transactions(t.id for t in transactions)

            # Add to transaction store, generating a central serial for each
            serials = self.session.db.add_transactions(transactions)

            # Create an acknowledgment message to the source
            reply = create_transactions_ack(msg_id, transactions, serials)
            self.write_message(json.dumps(reply))

            # Broadcast the tranasctions to all other stores
            # First, filter away duplicates
            filtered = filter_duplicates(transactions, serials, is_duplicate)
            self.session.broadcast_transactions(self, *zip(*filtered))

        elif msg_type == 'storeid-request':
            if not self.check_permissions('r'):
                return self.send_error_reply(
                    msg_id,
                    'Permisson error: Cannot access session: %s' % (self.session_id,)
                )
            self.store_id = self.session.create_store_id()
            reply = create_storeid_reply(msg_id, self.store_id)
            self.write_message(json.dumps(reply))

        elif msg_type == 'history-request':
            if not self.check_permissions('r'):
                return self.send_error_reply(
                    msg_id,
                    'Permisson error: Cannot access session: %s' % (self.session_id,)
                )
            content = msg.pop('content', {})
            checkpoint_id = content.pop('checkpointId', None)
            history = self.session.db.history(checkpoint_id)
            reply = create_history_reply(
                msg_id,
                tuple(history.transactions),
                history.state
            )
            self.write_message(json.dumps(reply))

        elif msg_type == 'transaction-request':
            if not self.check_permissions('r'):
                return self.send_error_reply(
                    msg_id,
                    'Permisson error: Cannot access session: %s' % (self.session_id,)
                )
            content = msg.pop('content', None)
            if content is None:
                return
            transactionIds = content.pop('transactionIds', [])
            transactions = tuple(self.session.db.get_transactions(transactionIds))
            reply = create_transaction_reply(msg_id, transactions)
            self.write_message(json.dumps(reply))

        elif msg_type == 'serial-request':
            if not self.check_permissions('r'):
                return self.send_error_reply(
                    msg_id,
                    'Permisson error: Cannot access session: %s' % (self.session_id,)
                )
            content = msg.pop('content', None)
            if content is None:
                return
            serials = content.pop('serials', [])
            transactions = tuple(self.session.db.get_serials(serials))
            reply = create_serial_reply(msg_id, transactions)
            self.write_message(json.dumps(reply))

        elif msg_type == 'permissions-request':
            reply = create_permissions_reply(
                msg_id,
                self.check_permissions('r'),
                self.check_permissions('w')
            )
            self.write_message(json.dumps(reply))

        elif msg_type == 'serial-update':
            content = msg.pop('content', None)
            if content is None:
                return
            serial = content.pop('serial', None)
            if serial is not None:
                self.session.update_serial(self.store_id, serial)

        if reply:
            self.log.info('Sent reply: \n%r' % (reply, ))


# The path for lab build.
# TODO: Is this a reasonable path?
datastore_path = r"/lab/api/datastore/(?P<session_id>\w+)"
