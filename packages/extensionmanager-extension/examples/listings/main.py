# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os

HERE = os.path.dirname(__file__)

os.environ["JUPYTERLAB_SETTINGS_DIR"] = str(os.path.join(HERE, "settings"))

import json  # noqa

from jupyter_server.base.handlers import FileFindHandler  # noqa
from jupyter_server.utils import url_path_join as ujoin  # noqa
from traitlets import Unicode  # noqa

from jupyterlab.labapp import LabApp  # noqa

with open(os.path.join(HERE, "package.json")) as fid:
    version = json.load(fid)["version"]


class ListingsApp(LabApp):
    base_url = "/"
    default_url = Unicode("/lab", help="The default URL to redirect to from `/`")

    def init_webapp(self):
        """initialize tornado webapp and httpserver."""
        super().init_webapp()
        default_handlers = [
            (
                ujoin(self.base_url, r"/listings/(.*)"),
                FileFindHandler,
                {"path": os.path.join(HERE, "list")},
            )
        ]
        self.web_app.add_handlers(".*$", default_handlers)


if __name__ == "__main__":
    ListingsApp.launch_instance()
