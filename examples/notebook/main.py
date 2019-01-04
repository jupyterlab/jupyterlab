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

class NotebookHandler(IPythonHandler):
    """
    Serve a notebook file from the filesystem in the notebook interface
    """

    def get(self, notebook_path):
        """Get the main page for the application's interface."""
        # Options set here can be read with PageConfig.getOption
        config_data = {
            'base_url': self.base_url,
            'token': self.settings['token'],
            'notebook_path': notebook_path
        }
        return self.write(
            self.render_template(
                'index.html',
                static=self.static_url,
                base_url=self.base_url,
                config_data=config_data
            )
        )

    def get_template(self, name):
        loader = FileSystemLoader(HERE)
        return loader.load(self.settings['jinja2_env'], name)


class ExampleApp(NotebookApp):

    default_url = Unicode('/notebook/test.ipynb')

    def init_webapp(self):
        """initialize tornado webapp and httpserver.
        """
        super(ExampleApp, self).init_webapp()
        default_handlers = [
            (ujoin(self.base_url, r'notebook/(.*)?'), NotebookHandler),
            (ujoin(self.base_url, r"build/(.*)"), FileFindHandler,
                {'path': os.path.join(HERE, 'build')})
        ]
        self.web_app.add_handlers('.*$', default_handlers)


if __name__ == '__main__':
    ExampleApp.launch_instance()