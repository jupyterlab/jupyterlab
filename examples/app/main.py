# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os

from jupyterlab_server import LabServerApp

HERE = os.path.dirname(__file__)

# Turn off the Jupyter configuration system so configuration files on disk do
# not affect this app. This helps this app to truly be standalone.
os.environ["JUPYTER_NO_CONFIG"] = "1"

with open(os.path.join(HERE, "package.json")) as fid:
    version = json.load(fid)["version"]


def _jupyter_server_extension_points():
    return [{"module": __name__, "app": ExampleApp}]


class ExampleApp(LabServerApp):
    extension_url = "/lab"
    default_url = "/lab"
    name = __name__
    load_other_extensions = False
    app_name = "JupyterLab Example App"
    app_settings_dir = os.path.join(HERE, "build", "application_settings")
    app_version = version
    schemas_dir = os.path.join(HERE, "build", "schemas")
    static_dir = os.path.join(HERE, "build")
    templates_dir = os.path.join(HERE, "templates")
    themes_dir = os.path.join(HERE, "build", "themes")
    user_settings_dir = os.path.join(HERE, "build", "user_settings")
    workspaces_dir = os.path.join(HERE, "build", "workspaces")

    def initialize_settings(self):
        super().initialize_settings()
        settings = self.serverapp.web_app.settings
        settings["terminals_available"] = False


if __name__ == "__main__":
    ExampleApp.launch_instance()
