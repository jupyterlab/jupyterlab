# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os
from tornado import web

from notebook.notebookapp import NotebookApp
from traitlets import Dict, Unicode
from notebook.base.handlers import IPythonHandler, FileFindHandler
from jinja2 import FileSystemLoader
from notebook.utils import url_path_join as ujoin
from jupyter_core.paths import jupyter_path

from ._version import __version__
from .labextensions import (
    find_labextension, validate_labextension_folder,
    get_labextension_manifest_data_by_name,
    get_labextension_manifest_data_by_folder,
    get_labextension_config_python
)

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
BUILT_FILES = os.path.join(HERE, 'build')
PREFIX = '/lab'
EXTENSION_PREFIX = '/labextension'


class LabHandler(IPythonHandler):
    """Render the Jupyter Lab View."""

    @web.authenticated
    def get(self):
        static_prefix = ujoin(self.base_url, PREFIX)
        labextensions = self.application.labextensions
        data = get_labextension_manifest_data_by_folder(BUILT_FILES)
        if 'main' not in data:
            msg = ('JupyterLab build artifacts not detected, please see ' + 
                   'CONTRIBUTING.md for build instructions.')
            self.log.error(msg)
            self.write(self.render_template('error.html', 
                       status_code=500, 
                       status_message='JupyterLab Error',
                       page_title='JupyterLab Error',
                       message=msg))
            return

        main = data['main']['entry']
        bundles = [ujoin(static_prefix, name + '.bundle.js') for name in
                   ['loader', 'main']]
        entries = []

        # Only load CSS files if they exist.
        css_files = []
        for css_file in ['main.css']:
            if os.path.isfile(os.path.join(BUILT_FILES, css_file)):
                css_files.append(ujoin(static_prefix, css_file))

        config = dict(
            static_prefix=static_prefix,
            page_title='JupyterLab Alpha Preview',
            mathjax_url=self.mathjax_url,
            jupyterlab_main=main,
            jupyterlab_css=css_files,
            jupyterlab_bundles=bundles,
            plugin_entries=entries,
            mathjax_config='TeX-AMS_HTML-full,Safe',
            #mathjax_config=self.mathjax_config # for the next release of the notebook
        )

        configData = dict(
            terminalsAvailable=self.settings.get('terminals_available', False),
        )

        # Gather the lab extension files and entry points.
        for (name, data) in sorted(labextensions.items()):
            for value in data.values():
                if not isinstance(value, dict):
                    continue
                if value.get('entry', None):
                    entries.append(value['entry'])
                    bundles.append('%s/%s/%s' % (
                        EXTENSION_PREFIX, name, value['files'][0]
                    ))
                for fname in value['files']:
                    if os.path.splitext(fname)[1] == '.css':
                        css_files.append('%s/%s/%s' % (
                            EXTENSION_PREFIX, name, fname
                        ))
            python_module = data.get('python_module', None)
            if python_module:
                try:
                    value = get_labextension_config_python(python_module)
                    configData.update(value)
                except Exception as e:
                    self.log.error(e)

        config['jupyterlab_config'] = configData
        self.write(self.render_template('lab.html', **config))

    def get_template(self, name):
        return FILE_LOADER.load(self.settings['jinja2_env'], name)


#-----------------------------------------------------------------------------
# URL to handler mappings
#-----------------------------------------------------------------------------

default_handlers = [
    (PREFIX + r'/?', LabHandler),
    (PREFIX + r"/(.*)", FileFindHandler,
        {'path': BUILT_FILES}),
]


class LabApp(NotebookApp):
    version = __version__

    description = """
        JupyterLab - An extensible computational environment for Jupyter.

        This launches a Tornado based HTML Server that serves up an
        HTML5/Javascript JupyterLab client.
    """

    examples = """
        jupyter lab                       # start JupyterLab
        jupyter lab --certfile=mycert.pem # use SSL/TLS certificate
    """

    subcommands = dict()

    default_url = Unicode('/lab', config=True,
        help="The default URL to redirect to from `/`"
    )

    labextensions = Dict({}, config=True,
        help=('Dict of Python modules to load as lab extensions.'
            'Each entry consists of a required `enabled` key used'
            'to enable or disable the extension, and an optional'
            '`python_module` key for the associated python module.'
            'Extensions are loaded in alphabetical order')
    )

    def init_webapp(self):
        """initialize tornado webapp and httpserver.
        """
        super(LabApp, self).init_webapp()
        self.add_lab_handlers(self.web_app)
        self.add_labextensions(self.web_app)

    def add_labextensions(self, webapp):
        """Get the enabledd and valid lab extensions.

        Notes
        -------
        Adds a `labextensions` property to the webapp, which is a dict
        containing manifest data for each enabled and active extension,
        and optionally its associated python_module.
        """
        out = dict()
        for (name, config) in self.labextensions.items():
            if not config['enabled']:
                continue
            folder = find_labextension(name)
            if folder is None:
                continue
            warnings = validate_labextension_folder(name, folder)
            if warnings:
                continue
            data = get_labextension_manifest_data_by_name(name)
            if data is None:
                continue
            data['python_module'] = config.get('python_module', None)
            out[name] = data
        webapp.labextensions = out

    def add_lab_handlers(self, webapp):
        """Add the lab-specific handlers to the tornado app."""
        base_url = webapp.settings['base_url']
        webapp.add_handlers(".*$",
            [(ujoin(base_url, h[0]),) + h[1:] for h in default_handlers])
        labextension_handler = (
            r"%s/(.*)" % EXTENSION_PREFIX, FileFindHandler, {
                'path': jupyter_path('labextensions'),
                'no_cache_paths': ['/'],  # don't cache anything in labbextensions
            }
        )
        webapp.add_handlers(".*$", [labextension_handler])
        base_dir = os.path.realpath(os.path.join(HERE, '..'))
        dev_mode = os.path.exists(os.path.join(base_dir, '.git'))
        if dev_mode:
            self.log.info(DEV_NOTE_NPM)


def bootstrap_from_nbapp(nbapp):
    """Bootstrap the lab app on top of a notebook app.
    """
    labapp = LabApp()
    labapp.load_config_file()
    webapp = nbapp.web_app
    labapp.add_lab_handlers(webapp)
    labapp.add_labextensions(webapp)


#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance
