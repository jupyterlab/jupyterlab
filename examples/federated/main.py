# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import os

from jupyterlab_server import LabServerApp

HERE = os.path.abspath(os.path.dirname(__file__))

# Turn off the Jupyter configuration system so configuration files on disk do
# not affect this app. This helps this app to truly be standalone.
os.environ["JUPYTER_NO_CONFIG"] = "1"

with open(os.path.join(HERE, "package.json")) as fid:
    version = json.load(fid)["version"]


def _jupyter_server_extension_points():
    return [{"module": __name__, "app": ExampleApp}]


class ExampleApp(LabServerApp):
    name = "lab"
    load_other_extensions = False
    app_name = "JupyterLab Example App with Prebuilt Extensions"
    app_settings_dir = os.path.join(HERE, "data", "application_settings")
    app_version = version
    schemas_dir = os.path.join(HERE, "data", "schemas")
    static_dir = os.path.join(HERE, "core_package", "static")
    templates_dir = os.path.join(HERE, "templates")
    themes_dir = os.path.join(HERE, "data", "themes")
    user_settings_dir = os.path.join(HERE, "data", "user_settings")
    workspaces_dir = os.path.join(HERE, "data", "workspaces")

    # Set the location for prebuilt extensions, overriding the default
    # of looking in each of the Jupyter data paths.
    labextensions_path = [os.path.join(HERE, "labextensions")]

    def initialize_settings(self):
        super().initialize_settings()
        settings = self.serverapp.web_app.settings
        settings["terminals_available"] = False


if __name__ == "__main__":
    ExampleApp.launch_instance()
