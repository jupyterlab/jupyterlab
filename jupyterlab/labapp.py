# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os
from tornado import web

from notebook.notebookapp import NotebookApp
from traitlets import Unicode
from notebook.base.handlers import IPythonHandler, FileFindHandler
from jinja2 import FileSystemLoader
from notebook.utils import url_path_join as ujoin
from jupyter_core.paths import jupyter_path

from ._version import __version__
from .labextensions import (
    find_labextension, validate_labextension_folder,
    get_labextension_manifest_data_by_name,
    get_labextension_manifest_data_by_folder,
    get_labextension_config_python, CONFIG_SECTION
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

    def initialize(self, labextensions, extension_prefix):
        self.labextensions = labextensions
        self.extension_prefix = extension_prefix

    @web.authenticated
    def get(self):
        manifest = get_labextension_manifest_data_by_folder(BUILT_FILES)
        if 'main' not in manifest:
            msg = ('JupyterLab build artifacts not detected, please see ' +
                   'CONTRIBUTING.md for build instructions.')
            self.log.error(msg)
            self.write(self.render_template('error.html',
                       status_code=500,
                       status_message='JupyterLab Error',
                       page_title='JupyterLab Error',
                       message=msg))
            return

        config = self._get_lab_config(manifest)
        self.write(self.render_template('lab.html', **config))

    def _get_lab_config(self, manifest):
        """Get the config data for the page template."""
        static_prefix = ujoin(self.base_url, PREFIX)
        labextensions = self.labextensions
        main = manifest['main']['entry']
        bundles = [ujoin(static_prefix, name + '.bundle.js') for name in
                   ['loader', 'main']]
        entries = []

        # Only load CSS files if they exist.
        css_files = []
        for css_file in ['main.css']:
            if os.path.isfile(os.path.join(BUILT_FILES, css_file)):
                css_files.append(ujoin(static_prefix, css_file))

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
                        self.extension_prefix, name, value['files'][0]
                    ))
                for fname in value['files']:
                    if os.path.splitext(fname)[1] == '.css':
                        css_files.append('%s/%s/%s' % (
                            self.extension_prefix, name, fname
                        ))
            python_module = data.get('python_module', None)
            if python_module:
                try:
                    value = get_labextension_config_python(python_module)
                    configData.update(value)
                except Exception as e:
                    self.log.error(e)

        mathjax_config = self.settings.get('mathjax_config',
                                           'TeX-AMS_HTML-full,Safe')
        config = dict(
            static_prefix=static_prefix,
            page_title='JupyterLab Alpha Preview',
            mathjax_url=self.mathjax_url,
            mathjax_config=mathjax_config,
            jupyterlab_main=main,
            jupyterlab_css=css_files,
            jupyterlab_bundles=bundles,
            plugin_entries=entries,
        )
        config['jupyterlab_config'] = configData
        return config

    def get_template(self, name):
        return FILE_LOADER.load(self.settings['jinja2_env'], name)


def get_extensions(lab_config):
    """Get the valid extensions from lab config."""
    extensions = dict()
    labextensions = lab_config.get('labextensions', {})
    for (name, ext_config) in labextensions.items():
        if not ext_config['enabled']:
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
        data['python_module'] = ext_config.get('python_module', None)
        extensions[name] = data
    return extensions


def add_handlers(web_app, labextensions):
    """Add the appropriate handlers to the web app.
    """
    base_url = web_app.settings['base_url']
    prefix = ujoin(base_url, PREFIX)
    extension_prefix = ujoin(base_url, EXTENSION_PREFIX)
    handlers = [
        (prefix + r'/?', LabHandler, {
            'labextensions': labextensions,
            'extension_prefix': extension_prefix
        }),
        (prefix + r"/(.*)", FileFindHandler, {
            'path': BUILT_FILES
        }),
        (extension_prefix + r"/(.*)", FileFindHandler, {
            'path': jupyter_path('labextensions'),
            'no_cache_paths': ['/'],  # don't cache anything in labextensions
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

    lab_config = nbapp.config.get(CONFIG_SECTION, {})
    extensions = get_extensions(lab_config)
    add_handlers(nbapp.web_app, extensions)


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
        help="The default URL to redirect to from `/`")

    def init_server_extensions(self):
        """Load any extensions specified by config.

        Import the module, then call the load_jupyter_server_extension function,
        if one exists.

        If the JupyterLab server extension is not enabled, it will
        be manually loaded with a warning.

        The extension API is experimental, and may change in future releases.
        """
        super(LabApp, self).init_server_extensions()
        msg = 'JupyterLab server extension not enabled, manually loading...'
        if not self.nbserver_extensions.get('jupyterlab', False):
            self.log.warn(msg)
            load_jupyter_server_extension(self)

#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance
