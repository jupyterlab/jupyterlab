"""
Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.
"""
from notebook.notebookapp import NotebookApp
import os
from jinja2 import FileSystemLoader
from notebook.base.handlers import IPythonHandler, FileFindHandler
from notebook.utils import url_path_join as ujoin
from traitlets import Unicode


HERE = os.path.dirname(__file__)
LOADER = FileSystemLoader(HERE)


class ExampleHander(IPythonHandler):
    """Handle requests between the main app page and notebook server."""

    def get(self):
        """Get the main page for the application's interface."""
        return self.write(self.render_template('index.html',
                                               static=self.static_url,
                                               base_url=self.base_url,
                                               token=self.settings['token']))

    def get_template(self, name):
        return LOADER.load(self.settings['jinja2_env'], name)


class ExampleApp(NotebookApp):
    """A notebook app that runs the example."""

    default_url = Unicode('/example')

    def start(self):
        default_handlers = [
            (ujoin(self.base_url, r'/example/?'), ExampleHander),
            (ujoin(self.base_url, r'/example/(.*)'), FileFindHandler, {'path': HERE}),
        ]
        self.web_app.add_handlers('.*$', default_handlers)
        super(ExampleApp, self).start()


if __name__ == '__main__':
    ExampleApp.launch_instance()
