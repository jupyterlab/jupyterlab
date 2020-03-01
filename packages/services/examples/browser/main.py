"""
Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.
"""
import os
import json
import os.path as osp
from jupyter_server.base.handlers import JupyterHandler, FileFindHandler
from jupyter_server.extension.handler import ExtensionHandlerMixin, ExtensionHandlerJinjaMixin
from jupyterlab_server import LabServerApp, LabConfig
from jupyter_server.utils import url_path_join as ujoin
from traitlets import Unicode


HERE = osp.dirname(__file__)

with open(os.path.join(HERE, 'package.json')) as fid:
    version = json.load(fid)['version']

class ExampleHandler(ExtensionHandlerJinjaMixin, ExtensionHandlerMixin, JupyterHandler):
    """Handle requests between the main app page and notebook server."""

    def initialize(self):
        super().initialize('lab')

    def get(self):
        """Get the main page for the application's interface."""
        config_data = {
            # Use camelCase here, since that's what the lab components expect
            "appVersion": version,
            'baseUrl': self.base_url,
            'token': self.settings['token'],
            'fullStaticUrl': ujoin(self.base_url, 'static', 'example_app'), 
            'frontendUrl': ujoin(self.base_url, 'example/'),
        }
        return self.write(
            self.render_template(
                'index.html',
                static=self.static_url,
                base_url=self.base_url,
                token=self.settings['token'],
                page_config=config_data
                )
            )

class ExampleApp(LabServerApp):
    """A notebook app that runs the example."""

    default_url = Unicode('/example')

    LabServerApp.lab_config = LabConfig(
        app_name = 'JupyterLab Example Service',
        app_url = '/example_app',
        static_dir = os.path.join(HERE, 'build'),
        templates_dir = os.path.join(HERE, 'templates'),
        app_version = version, 
        app_settings_dir = os.path.join(HERE, 'build', 'application_settings'),
        schemas_dir = os.path.join(HERE, 'build', 'schemas'),
        themes_dir = os.path.join(HERE, 'build', 'themes'),
        user_settings_dir = os.path.join(HERE, 'build', 'user_settings'),
        workspaces_dir = os.path.join(HERE, 'build', 'workspaces'),
    )

    def initialize_handlers(self):
        """initialize tornado webapp and httpserver.
        """
        default_handlers = [
            (ujoin(self.serverapp.base_url, 'example'), ExampleHandler),
        ]
        self.serverapp.web_app.add_handlers('.*$', default_handlers)
        super().initialize_handlers()


if __name__ == '__main__':
    ExampleApp.launch_instance()
