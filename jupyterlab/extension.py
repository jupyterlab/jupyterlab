# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os
from tornado import web

from notebook.base.handlers import IPythonHandler, FileFindHandler
from jinja2 import FileSystemLoader
from notebook.utils import url_path_join as ujoin
from jupyter_core.paths import ENV_JUPYTER_PATH



#-----------------------------------------------------------------------------
# Module globals
#-----------------------------------------------------------------------------

DEV_NOTE_NPM = """It looks like you're running JupyterLab from source.
If you're working on the TypeScript sources of JupyterLab, try running

    npm run watch

from the JupyterLab repo directory in another terminal window to have the
system incrementally watch and build JupyterLab's TypeScript for you, as you
make changes.
"""

HERE = os.path.dirname(__file__)
FILE_LOADER = FileSystemLoader(HERE)
PREFIX = '/lab'


class LabHandler(IPythonHandler):
    """Render the JupyterLab View."""

    def initialize(self, page_config_data, built_files):
        self.page_config_data = page_config_data
        self.built_files = built_files

    @web.authenticated
    def get(self):
        config = self._get_lab_config()
        self.write(self.render_template('lab.html', **config))

    def _get_lab_config(self):
        """Get the config data for the page template."""
        static_prefix = ujoin(self.base_url, PREFIX)
        bundles = [ujoin(static_prefix, name + '.bundle.js') for name in
                   ['main']]

        # Only load CSS files if they exist.
        css_files = []
        for css_file in ['main.css']:
            if os.path.isfile(os.path.join(self.built_files, css_file)):
                css_files.append(ujoin(static_prefix, css_file))

        configData = dict(self.page_config_data)
        configData.update(dict(
            terminalsAvailable=self.settings.get('terminals_available', False),
        ))

        mathjax_config = self.settings.get('mathjax_config',
                                           'TeX-AMS_HTML-full,Safe')
        config = dict(
            static_prefix=static_prefix,
            page_title='JupyterLab Alpha Preview',
            mathjax_url=self.mathjax_url,
            mathjax_config=mathjax_config,
            jupyterlab_css=css_files,
            jupyterlab_bundles=bundles,
        )
        config['jupyterlab_config'] = configData
        return config

    def get_template(self, name):
        return FILE_LOADER.load(self.settings['jinja2_env'], name)


def add_handlers(nbapp):
    """Add the appropriate handlers to the web app.
    """
    web_app = nbapp.web_app
    base_url = web_app.settings['base_url']
    prefix = ujoin(base_url, PREFIX)
    page_config_data = web_app.settings.get('page_config_data', {})
    built_files = os.path.join(ENV_JUPYTER_PATH[0], 'lab', 'build')

    # Check for dev mode.
    dev_mode = os.environ.get('JUPYTERLAB_DEV', False)
    if not os.path.exists(built_files) or dev_mode:
        built_files = os.path.join(HERE, 'build')

    handlers = [
        (prefix + r'/?', LabHandler, {
            'page_config_data': page_config_data,
            'built_files': built_files
        }),
        (prefix + r"/(.*)", FileFindHandler, {
            'path': built_files
        })
    ]
    web_app.add_handlers(".*$", handlers)


def load_jupyter_server_extension(nbapp):
    """Load the JupyterLab server extension.
    """
    # Print messages.
    nbapp.log.info('JupyterLab alpha preview extension loaded from %s' % HERE)
    base_dir = os.path.realpath(os.path.join(HERE, '..'))
    dev_mode = os.path.exists(os.path.join(base_dir, '.git'))
    if dev_mode:
        nbapp.log.info(DEV_NOTE_NPM)

    add_handlers(nbapp)
