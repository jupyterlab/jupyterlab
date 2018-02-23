"""
Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.
"""

import os
from jinja2 import FileSystemLoader
from notebook.base.handlers import IPythonHandler, FileFindHandler
from notebook.utils import url_path_join as ujoin
from notebook.notebookapp import NotebookApp
from traitlets import Unicode
from jupyterlab_launcher.handlers import SettingsHandler, ThemesHandler

HERE = os.path.dirname(__file__)


class ExampleHandler(IPythonHandler):
    """Handle requests between the main app page and notebook server."""

    def get(self):
        """Get the main page for the application's interface."""
        return self.write(self.render_template("index.html",
            static=self.static_url, base_url=self.base_url,
            terminals_available=self.settings['terminals_available'],
            page_config=self.settings['page_config_data']))

    def get_template(self, name):
        loader = FileSystemLoader(os.getcwd())
        return loader.load(self.settings['jinja2_env'], name)


class ExampleApp(NotebookApp):

    default_url = Unicode('/example')

    def init_webapp(self):
        """initialize tornado webapp and httpserver.
        """
        super(ExampleApp, self).init_webapp()
        wsettings = self.web_app.settings
        base_url = wsettings['base_url']
        page_url = self.default_url
        settings_path = ujoin(
            base_url, page_url, 'api', 'settings', '(?P<section_name>.+)'
        )
        themes_path = ujoin(
            base_url, page_url, 'api', 'themes'
        )

        wsettings.setdefault('page_config_data', dict())
        wsettings['page_config_data']['token'] = self.token
        wsettings['page_config_data']['pageUrl'] = page_url
        wsettings['page_config_data']['themesUrl'] = themes_path
        mathjax_config = wsettings.get('mathjax_config',
                'TeX-AMS_HTML-full,Safe')
        wsettings['page_config_data'].setdefault('mathjaxConfig',
                mathjax_config)
        wsettings['page_config_data'].setdefault('mathjaxUrl', self.mathjax_url)

        default_handlers = [
            (ujoin(base_url, '/example?'), ExampleHandler),
            ((settings_path, SettingsHandler, {
                'schemas_dir': os.path.join(HERE, 'build', 'schemas'),
                'settings_dir': os.path.join(HERE, 'build', 'settings'),
                'app_settings_dir': os.path.join(HERE, 'build', 'schemas'),
            })),
            ((ujoin(themes_path, "(.*)"), ThemesHandler, {
                'themes_url': themes_path,
                'path': os.path.join(HERE, 'build', 'themes')
            })),
            (ujoin(base_url, '/example/static/(.*)'), FileFindHandler,
                {'path': 'build'}),
            # Let the lab handler act as the fallthrough option instead
            # of a 404.
            (ujoin(base_url, page_url, r'/?.*'), ExampleHandler)
        ]

        self.web_app.add_handlers(".*$", default_handlers)


if __name__ == '__main__':
    ExampleApp.launch_instance()
