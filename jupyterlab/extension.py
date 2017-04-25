# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os

from jinja2 import FileSystemLoader
from jupyterlab_launcher import add_handlers, LabConfig

from .commands import describe, _get_config_dir, _get_runtime_dir
from ._version import __version__

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


def load_jupyter_server_extension(nbapp):
    """Load the JupyterLab server extension.
    """
    # Print messages.
    nbapp.log.info('JupyterLab alpha preview extension loaded from %s' % HERE)

    web_app = nbapp.web_app
    config = LabConfig()
    config.runtime_dir = _get_runtime_dir()
    config.config_dir = _get_config_dir()
    config.page_title = 'JupyterLab Alpha Preview'
    config.name = 'JupyterLab'
    config.prefix = PREFIX
    config.version = __version__

    # Check for dev mode.
    dev_mode = False
    if hasattr(nbapp, 'dev_mode'):
        dev_mode = nbapp.dev_mode

    if dev_mode:
        nbapp.log.info(DEV_NOTE_NPM)
        config.runtime_dir = HERE
        config.config_dir = ''
        config.version = describe()

    add_handlers(web_app, config)
