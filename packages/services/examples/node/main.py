# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function, absolute_import
import json
import os
from jupyterlab_launcher.process import which
from jupyterlab_launcher.process_app import ProcessApp

HERE = os.path.dirname(os.path.realpath(__file__))


class NodeApp(ProcessApp):

    def get_command(self):
        """Get the command and kwargs to run.
        """
        # Run the node script with command arguments.
        config = dict(baseUrl=self.connection_url, token=self.token)

        with open('config.json', 'w') as fid:
            json.dump(config, fid)

        cmd = [which('node'), 'index.js', '--jupyter-config-data=./config.json']
        return cmd, dict(cwd=HERE)


if __name__ == '__main__':
    NodeApp.launch_instance()
