"""
An example demonstrating a stand-alone "notebook".

Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.

Example
-------

To run the example, see the instructions in the README to build it. Then
run ``python main.py``.

"""
import os
from jinja2 import FileSystemLoader

from traitlets import Unicode

from jupyterlab_launcher.server import ServerApp, JupyterHandler, FileFindHandler


class ExampleHandler(JupyterHandler):
    """Handle requests between the main app page and notebook server."""

    def get(self):
        """Get the main page for the application's interface."""
        return self.write(self.render_template("index.html",
            static=self.static_url, base_url=self.base_url,
            token=self.settings['token']))

    def get_template(self, name):
        loader = FileSystemLoader(os.getcwd())
        return loader.load(self.settings['jinja2_env'], name)


class ExampleApp(ServerApp):

    default_url = Unicode('/example')

    def init_webapp(self):
        """initialize tornado webapp and httpserver.
        """
        super(ExampleApp, self).init_webapp()
        default_handlers = [
            (r'/example/?', ExampleHandler),
            (r"/example/(.*)", FileFindHandler,
                {'path': 'build'}),
        ]
        self.web_app.add_handlers(".*$", default_handlers)


if __name__ == '__main__':
    ExampleApp.launch_instance()
