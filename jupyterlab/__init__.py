"""Tornado handlers for the Lab view."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
from tornado import web
from notebook.base.handlers import IPythonHandler, FileFindHandler
from jinja2 import FileSystemLoader
from notebook.utils import url_path_join as ujoin
from jupyter_core.paths import jupyter_path

from .labapp import LabApp
from .labextensions import (
    get_labextension_manifest_data_by_name, get_labextension_config_python,
    get_labextension_manifest_data_by_folder
)

try:
    from ._version import __version__
except ImportError as e:
    # when we are python 3 only, add 'from e' at the end to chain the exception.
    raise ImportError("No module named 'jupyter._version'. Build the jupyterlab package to generate this module, for example, with `pip install -e /path/to/jupyterlab/repo`.")

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
        if 'main' not in data or 'extensions' not in data:
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
                   ['loader', 'main', 'extensions']]
        entries = [data['extensions']['entry']]

        # Only load CSS files if they exist.
        css_files = []
        for css_file in ['main.css', 'extensions.css']:
            if os.path.isfile(os.path.join(BUILT_FILES, css_file)):
                css_files.append(ujoin(static_prefix, css_file))

        config = dict(
            static_prefix=static_prefix,
            page_title='JupyterLab Alpha Preview',
            terminals_available=self.settings['terminals_available'],
            mathjax_url=self.mathjax_url,
            jupyterlab_main=main,
            jupyterlab_css=css_files,
            jupyterlab_bundles=bundles,
            plugin_entries=entries,
            mathjax_config='TeX-AMS_HTML-full,Safe',
            #mathjax_config=self.mathjax_config # for the next release of the notebook
        )

        # Gather the lab extension files and entry points.
        # Make sure we only load an extension once for each name.
        seen = set()
        for (name, value) in sorted(labextensions.items()):
            if not value['enabled'] or name in seen:
                continue
            seen.add(name)
            data = get_labextension_manifest_data_by_name(name)
            if data is None:
                self.log.warn('Could not locate extension: ' + name)
                continue
            for value in data.values():
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
            python_module = value.get('python_module', None)
            if python_module:
                try:
                    value = get_labextension_config_python(python_module)
                    config.update(value)
                except Exception as e:
                    self.log.error(e)

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


def _jupyter_server_extension_paths():
    return [{
        "module": "jupyterlab"
    }]


def load_jupyter_server_extension(nbapp):
    if not isinstance(nbapp, LabApp):
        labapp = LabApp()
        labapp.load_config_file()
        labextensions = labapp.labextensions
    else:
        labextensions = nbapp.labextensions

    base_dir = os.path.realpath(os.path.join(HERE, '..'))
    dev_mode = os.path.exists(os.path.join(base_dir, '.git'))
    if dev_mode:
        nbapp.log.info(DEV_NOTE_NPM)
    nbapp.log.info('JupyterLab alpha preview extension loaded from %s' % HERE)
    webapp = nbapp.web_app
    webapp.labextensions = labextensions

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
