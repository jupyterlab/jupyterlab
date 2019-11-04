# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyterlab_server import LabServerApp, LabConfig
from notebook.utils import url_path_join as ujoin
import json
import os
from traitlets import Unicode

HERE = os.path.dirname(__file__)

# Turn off the Jupyter configuration system so configuration files on disk do
# not affect this app. This helps this app to truly be standalone.
os.environ["JUPYTER_NO_CONFIG"]="1"

with open(os.path.join(HERE, 'package.json')) as fid:
    version = json.load(fid)['version']

class ExampleApp(LabServerApp):
    base_url = '/foo'
    default_url = Unicode('/example',
                          help='The default URL to redirect to from `/`')

    lab_config = LabConfig(
        app_name = 'JupyterLab Example App',
        app_settings_dir = os.path.join(HERE, 'build', 'application_settings'),
        app_version = version,
        app_url = '/example',
        schemas_dir = os.path.join(HERE, 'build', 'schemas'),
        static_dir = os.path.join(HERE, 'build'),
        templates_dir = os.path.join(HERE, 'templates'),
        themes_dir = os.path.join(HERE, 'build', 'themes'),
        user_settings_dir = os.path.join(HERE, 'build', 'user_settings'),
        workspaces_dir = os.path.join(HERE, 'build', 'workspaces'),
    )

    def start(self):
        settings = self.web_app.settings

        # By default, make terminals available.
        settings.setdefault('terminals_available', True)

        super().start()

if __name__ == '__main__':
    ExampleApp.launch_instance()
