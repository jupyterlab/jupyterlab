from jupyter_server.base.handlers import APIHandler
import json


class CurrentUserHandler(APIHandler):
    """A Handler returning the current user information"""

    @web.authenticated
    @gen.coroutine
    def get(self):
        """GET query returns info on the current user"""
        yield json.dumps({
            'name': 'Victor Hugo'
        })

class ConnectedUsersHandler(APIHandler):
    """A Handler returning the list of connected users"""

    @web.authenticated
    @gen.coroutine
    def get(self):
        """GET query returns the list of connected users"""
        yield json.dumps([])

# The path for lab extensions handler.
extensions_handler_path = r"/lab/api/extensions"
