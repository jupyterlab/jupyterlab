"""
An example demonstrating a stand-alone "terminal".

Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.

Example
-------

To run the example, see the instructions in the README to build it. Then
run ``python main.py``.

"""
import os
from jinja2 import FileSystemLoader
from notebook.base.handlers import IPythonHandler, FileFindHandler
from notebook.notebookapp import NotebookApp
from traitlets import Unicode


class ExampleHandler(IPythonHandler):
    """Handle requests between the main app page and notebook server."""

    def get(self):
        """Get the main page for the application's interface."""
        return self.write(self.render_template("index.html",
            static=self.static_url, base_url=self.base_url,
            terminals_available=self.settings['terminals_available']))

    def get_template(self, name):
        loader = FileSystemLoader(os.getcwd())
        return loader.load(self.settings['jinja2_env'], name)


class ExampleApp(NotebookApp):

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
