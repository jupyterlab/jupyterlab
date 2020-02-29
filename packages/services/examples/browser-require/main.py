"""
Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.
"""
import os
from jupyter_server.base.handlers import JupyterHandler, FileFindHandler
from jupyter_server.extension.handler import ExtensionHandlerMixin, ExtensionHandlerJinjaMixin
from jupyterlab_server import LabServerApp, LabConfig
from jupyter_server.utils import url_path_join as ujoin
from traitlets import Unicode


HERE = os.path.dirname(__file__)

class ExampleHandler(ExtensionHandlerJinjaMixin, ExtensionHandlerMixin, JupyterHandler):
    """Handle requests between the main app page and notebook server."""

    def initialize(self):
        super().initialize('lab')

    def get(self):
        """Get the main page for the application's interface."""
        config_data = {
            # Use camelCase here, since that's what the lab components expect
            'baseUrl': self.base_url,
            'token': self.settings['token'],
            'fullStaticUrl': ujoin(self.base_url, 'static', 'example'), 
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

    default_url = Unicode('/example')

    def initialize_handlers(self):
        """initialize tornado webapp and httpserver.
        """
        default_handlers = [
            (ujoin(self.serverapp.base_url, 'example'), ExampleHandler),
        ]
        self.serverapp.web_app.add_handlers('.*$', default_handlers)
        LabServerApp.lab_config = LabConfig(
            app_name = 'JupyterLab Example Service Browser Require',
            app_url = '/example',
            static_dir = os.path.join(HERE, 'static'),
            templates_dir = os.path.join(HERE),
        )
        super().initialize_handlers()


if __name__ == '__main__':
    ExampleApp.launch_instance()
