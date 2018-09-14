"""
Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.
"""

from jupyterlab_server import LabServerApp, LabConfig
import os

HERE = os.path.dirname(__file__)

class ExampleApp(LabServerApp):
    lab_config = LabConfig(
        app_name = 'JupyterLab Example App',
        app_settings_dir = os.path.join(HERE, 'build', 'application_settings'),
        app_version = '0.1.0',
        schemas_dir = os.path.join(HERE, 'build', 'schemas'),
        settings_dir = os.path.join(HERE, 'build', 'settings'),
        static_dir=os.path.join(HERE, 'build'),
        templates_dir=os.path.join(HERE, 'templates'),
        themes_dir = os.path.join(HERE, 'build', 'themes'),
        user_settings_dir = os.path.join(HERE, 'build', 'user_settings'),
        workspaces_dir = os.path.join(HERE, 'build', 'workspaces'),
    )

    def start(self):
        self.web_app.settings.setdefault('terminals_available', True)
        super().start()

if __name__ == '__main__':
    ExampleApp.launch_instance()
