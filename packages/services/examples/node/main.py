# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os.path as osp

from jupyterlab_server.process import which
from jupyterlab_server.process_app import ProcessApp

HERE = osp.dirname(osp.realpath(__file__))


def _jupyter_server_extension_points():
    return [{"module": __name__, "app": NodeApp}]


class NodeApp(ProcessApp):
    name = __name__
    serverapp_config = {"allow_origin": "*"}

    def get_command(self):
        """Get the command and kwargs to run."""
        # Run the node script with command arguments.
        config = {
            "baseUrl": "http://localhost:{}{}".format(
                self.serverapp.port, self.settings["base_url"]
            ),
            "token": self.settings["token"],
        }

        with open(osp.join(HERE, "config.json"), "w") as fid:
            json.dump(config, fid)

        cmd = [which("node"), "index.js", "--jupyter-config-data=./config.json"]
        return cmd, {"cwd": HERE}


if __name__ == "__main__":
    NodeApp.launch_instance()
