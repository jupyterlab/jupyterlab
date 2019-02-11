
import json
import uuid

from notebook.base.handlers import IPythonHandler
from notebook.base.zmqhandlers import WebSocketMixin
from tornado import gen, web
from tornado.websocket import WebSocketHandler

from .db import DatastoreDB


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
        super(DatastoreHandler, self).get(*args, **kwargs)

    def get_compression_options(self):
        return self.settings.get('websocket_compression_options', None)


def create_storeid_reply(store_id):
    return dict(
        msgType='storeid-reply',
        content=dict(
            storeId=store_id
        )
    )

def create_transactions_ack(transactions):
    return dict(
        msgType='transaction-ack',
        content=dict(
            transactionIds=[t['id'] for t in transactions]
        )
    )

def create_history_reply(transactions):
    return dict(
        msgType='history-reply',
        content=dict(
            history=dict(
                transactions=transactions
            )
        )
    )

def create_fetch_reply(transactions):
    return dict(
        msgType='fetch-transaction-reply',
        content=dict(
            transactions=transactions
        )
    )


class DatastoreHandler(WSBaseHandler):

    stores = {} # map of RTC session id -> store id serial

    def initialize(self):
        self.log.debug("Initializing datastore connection %s", self.request.path)
        self.db = DatastoreDB(self.get_db_file())

    def pre_get(self):
        super(DatastoreHandler, self).pre_get()

        if self.get_argument('session_id', False):
            self.session_id = cast_unicode(self.get_argument('session_id'))
        else:
            self.log.warning("No session ID specified")
            self.session_id = uuid.uuid4()

        if self.stores.get(self.session_id, None) is None:
            self.stores[self.session_id] = 0

    def get_db_file(self):
        # TODO: user setting? Execution dir with pid? For now, use in-memory (None)
        return ':memory:'

    def create_store_id(self):
        self.stores[self.session_id] = 1 + self.stores[self.session_id]
        return self.stores[self.session_id]

    def open(self):
        # TODO: here / pre_get: add logic for reconnection?
        super(DatastoreHandler, self).open()

    def on_close(self):
        self.db.conn.close()
        super(DatastoreHandler, self).on_close()

    def on_message(self, message):
        msg = json.loads(message)
        msg_type = msg.pop('msgType', None)

        if msg_type == 'storeid-request':
            reply = create_storeid_reply(self.create_store_id())
            self.write_message(json.dumps(reply))

        elif msg_type == 'transaction-broadcast':
            content = msg.pop('content', None)
            if content is None:
                return
            transactions = content.pop('transactions', [])
            self.db.add_transactions(transactions)
            reply = create_transactions_ack(transactions)
            self.write_message(json.dumps(reply))

        elif msg_type == 'history-request':
            transactions = tuple(self.db.history())
            reply = create_history_reply(transactions)
            self.write_message(json.dumps(reply))

        elif msg_type == 'fetch-transaction-request':
            content = msg.pop('content', None)
            if content is None:
                return
            transactionIds = content.pop('transactionIds', [])
            transactions = tuple(self.db.get_transactions(transactionIds))
            reply = create_fetch_reply(transactions)
            self.write_message(json.dumps(reply))



# The path for lab build.
datastore_path = r"/lab/api/datastore"
