# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyterlab_server import LabServerApp, LabConfig
import os
from traitlets import Unicode

HERE = os.path.dirname(__file__)

class ExampleApp(LabServerApp):

    default_url = Unicode('/exampleapp',
                          help='The default URL to redirect to from `/`')

    lab_config = LabConfig(
        app_name = 'JupyterLab Example App',
        app_settings_dir = os.path.join(HERE, 'build', 'application_settings'),
        page_url = '/exampleapp',
        schemas_dir = os.path.join(HERE, 'build', 'schemas'),
        settings_dir = os.path.join(HERE, 'build', 'settings'),
        static_dir = os.path.join(HERE, 'build'),
        templates_dir = os.path.join(HERE, 'templates'),
        themes_dir = os.path.join(HERE, 'build', 'themes'),
        user_settings_dir = os.path.join(HERE, 'build', 'user_settings'),
        workspaces_dir = os.path.join(HERE, 'build', 'workspaces'),
    )

    def start(self):
        settings = self.web_app.settings

        # By default, terminals are available.
        settings.setdefault('terminals_available', True)

        # Override the build check setting from the jupyterlab server extension.
        settings.setdefault('page_config_data', dict())
        settings['page_config_data']['buildAvailable'] = False
        settings['page_config_data']['buildCheck'] = False

        super().start()

if __name__ == '__main__':
    ExampleApp.launch_instance()
