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
from notebook.base.handlers import IPythonHandler, FileFindHandler
from notebook.notebookapp import NotebookApp
from notebook.utils import url_path_join as ujoin
from traitlets import Unicode

HERE = os.path.dirname(__file__)

class ExampleHandler(IPythonHandler):
    """Handle requests between the main app page and notebook server."""

    def get(self):
        """Get the main page for the application's interface."""
        return self.write(self.render_template('index.html',
                                               static=self.static_url,
                                               base_url=self.base_url,
                                               token=self.settings['token']))

    def get_template(self, name):
        loader = FileSystemLoader(HERE)
        return loader.load(self.settings['jinja2_env'], name)


class ExampleApp(NotebookApp):

    default_url = Unicode('/example')

    def init_webapp(self):
        """initialize tornado webapp and httpserver.
        """
        super().init_webapp()
        default_handlers = [
            (ujoin(self.base_url, r'/example/?'), ExampleHandler),
            (ujoin(self.base_url, r"/example/(.*)"), FileFindHandler,
        {'path': os.path.join(HERE, 'build')})        ]
        self.web_app.add_handlers('.*$', default_handlers)


if __name__ == '__main__':
    ExampleApp.launch_instance()
