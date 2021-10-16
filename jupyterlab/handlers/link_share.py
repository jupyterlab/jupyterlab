# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import tornado
from jupyter_server.utils import url_path_join
from jupyter_server.base.handlers import APIHandler
from jupyter_server.serverapp import list_running_servers as list_jupyter_servers

class RouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        servers = list(list_jupyter_servers())
        # sort by pid so PID 1 is first in Docker and Binder
        servers.sort(key=lambda x: x["pid"])
        urls = []
        for server in servers:
            print(server)
            urls.append({
                "url": url_path_join(server["url"], server["base_url"]),
                "token": server["token"]
            })
        
        self.finish(json.dumps(urls))