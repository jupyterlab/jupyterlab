"""
An example demonstrating a stand-alone "filebrowser".

Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.

Example
-------

To run the example, see the instructions in the README to build it. Then
run ``python main.py``.

"""

import json
import os

from jupyterlab_server import LabServerApp

HERE = os.path.dirname(__file__)

with open(os.path.join(HERE, "package.json")) as fid:
    version = json.load(fid)["version"]


def _jupyter_server_extension_points():
    return [{"module": __name__, "app": ExampleApp}]


class ExampleApp(LabServerApp):
    extension_url = "/example"
    default_url = "/example"
    app_url = "/example"
    load_other_extensions = False
    name = __name__
    app_name = "JupyterLab Example File Browser"
    static_dir = os.path.join(HERE, "build")
    templates_dir = os.path.join(HERE, "templates")
    app_version = version
    app_settings_dir = os.path.join(HERE, "build", "application_settings")
    schemas_dir = os.path.join(HERE, "build", "schemas")
    themes_dir = os.path.join(HERE, "build", "themes")
    user_settings_dir = os.path.join(HERE, "build", "user_settings")
    workspaces_dir = os.path.join(HERE, "build", "workspaces")

    def initialize_settings(self):
        super().initialize_settings()
        settings = self.serverapp.web_app.settings
        settings["terminals_available"] = False


if __name__ == "__main__":
    ExampleApp.launch_instance()
