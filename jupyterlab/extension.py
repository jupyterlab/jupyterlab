# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os
from tornado import web

from notebook.base.handlers import IPythonHandler, FileFindHandler
from jinja2 import FileSystemLoader
from notebook.utils import url_path_join as ujoin
from notebook.services.config import ConfigManager
from jupyter_core.paths import jupyter_path, jupyter_config_path

from .labextensions import (
    find_labextension, validate_labextension_folder,
    get_labextension_manifest_data_by_name,
    get_labextension_manifest_data_by_folder,
    get_labextension_config_python, CONFIG_DIR
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
    """Render the JupyterLab View."""

    def initialize(self, labextensions, extension_prefix, page_config_data):
        self.labextensions = labextensions
        self.extension_prefix = extension_prefix
        self.page_config_data = page_config_data

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

        configData = dict(self.page_config_data)
        configData.update(dict(
            terminalsAvailable=self.settings.get('terminals_available', False),
        ))

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


def get_labconfig(nbapp):
    """Get the merged lab configuration."""
    # Load server extensions with ConfigManager.
    # This enables merging on keys, which we want for extension enabling.
    # Regular config loading only merges at the class level,
    # so each level (user > env > system) clobbers the previous.
    config_path = jupyter_config_path()
    if nbapp.config_dir not in config_path:
        # add nbapp's config_dir to the front, if set manually
        config_path.insert(0, nbapp.config_dir)
    config_path = [os.path.join(p, CONFIG_DIR) for p in config_path]
    return ConfigManager(read_config_path=config_path)


def get_extensions(lab_config):
    """Get the valid extensions from lab config."""
    extensions = dict()
    labextensions = lab_config.get('labextensions')
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
    page_config_data = web_app.settings.get('page_config_data', {})
    handlers = [
        (prefix + r'/?', LabHandler, {
            'labextensions': labextensions,
            'extension_prefix': extension_prefix,
            'page_config_data': page_config_data
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

    config = get_labconfig(nbapp)
    extensions = get_extensions(config)
    add_handlers(nbapp.web_app, extensions)
