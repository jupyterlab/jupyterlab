
import json
import os
import uuid

from notebook.base.handlers import IPythonHandler
from notebook.base.zmqhandlers import WebSocketMixin
from tornado import gen, web
from tornado.websocket import WebSocketHandler

from .messages import (
    create_error_reply,
    create_history_reply,
    create_permissions_reply,
    create_storeid_reply,
    create_transaction_reply,
    create_transactions_ack
)
from .session import Session


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

    @property
    def datastore_file(self):
        return self.settings.setdefault('datastore_file', ':memory:')

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

    def on_close(self):
        self.session.handlers.remove(self)
        if self.datastore_file != ':memory:' and not self.session.handlers:
            self.session.close()
            self.session = None
            del self.sessions[self.session_id]
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

            content = msg.pop('content', None)
            if content is None:
                return
            transactions = content.pop('transactions', [])
            serials = self.session.db.add_transactions(transactions)
            reply = create_transactions_ack(msg_id, transactions, serials)
            self.write_message(json.dumps(reply))
            self.session.broadcast(self, message)

        elif msg_type == 'storeid-request':
            if not self.check_permissions('r'):
                return self.send_error_reply(
                    msg_id,
                    'Permisson error: Cannot access session: %s' % (self.session_id,)
                )
            reply = create_storeid_reply(msg_id, self.session.create_store_id())
            self.write_message(json.dumps(reply))

        elif msg_type == 'history-request':
            if not self.check_permissions('r'):
                return self.send_error_reply(
                    msg_id,
                    'Permisson error: Cannot access session: %s' % (self.session_id,)
                )
            transactions = tuple(self.session.db.history())
            reply = create_history_reply(msg_id, transactions)
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

        elif msg_type == 'permissions-request':
            reply = create_permissions_reply(
                msg_id,
                self.check_permissions('r'),
                self.check_permissions('w')
            )
            self.write_message(json.dumps(reply))

        if reply:
            self.log.info('Sent reply: \n%r' % (reply, ))


# The path for lab build.
# TODO: Is this a reasonable path?
datastore_path = r"/lab/api/datastore/(?P<session_id>\w+)"
