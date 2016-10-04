"""Tornado handlers for the Lab view."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import glob
import json
import os
from tornado import web
from notebook.base.handlers import IPythonHandler, FileFindHandler
from jinja2 import FileSystemLoader
from notebook.utils import url_path_join as ujoin


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
__version__ = None


def get_labextension_manifest_data_by_folder(folder):
    """Get the manifest data for a given lab extension folder
    """
    manifest_files = glob.glob(os.path.join(folder, '*.manifest'))
    manifests = {}
    for file in manifest_files:
        with open(file) as fid:
            manifest = json.load(fid)
        manifests[manifest['name']] = manifest
    return manifests


def get_labextension_manifest_data_by_name(name):
    """Get the manifest data for a given lab extension folder
    """
    from .labextensions import _labextension_dirs
    for exts in _labextension_dirs():
        full_dest = os.path.join(exts, name)
        if os.path.exists(full_dest):
            return get_labextension_manifest_data_by_folder(full_dest)


class LabHandler(IPythonHandler):
    """Render the Jupyter Lab View."""

    @web.authenticated
    def get(self):
        static_prefix = ujoin(self.base_url, PREFIX)
        labextensions = self.application.labextensions

        data = get_labextension_manifest_data_by_folder(BUILT_FILES)
        css_files = [ujoin(static_prefix, 'main.css'),
                     ujoin(static_prefix, 'extensions.css')]
        main = data['main']['entry']
        bundles = [ujoin(static_prefix, name + '.bundle.js') for name in
                   ['loader', 'main', 'extensions']]
        entries = [data['extensions']['entry']]

        # Gather the lab extension files and entry points.
        for name in labextensions:
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

        self.write(self.render_template('lab.html',
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
        ))

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
    from jupyter_core.paths import jupyter_path
    from .labapp import get_labextensions

    base_dir = os.path.realpath(os.path.join(HERE, '..'))
    dev_mode = os.path.exists(os.path.join(base_dir, '.git'))
    if dev_mode:
        nbapp.log.info(DEV_NOTE_NPM)
    nbapp.log.info('JupyterLab alpha preview extension loaded from %s' % HERE)
    webapp = nbapp.web_app
    webapp.labextensions = get_labextensions(parent=nbapp)
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
