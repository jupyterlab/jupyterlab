# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os

from jinja2 import FileSystemLoader
from jupyterlab_launcher import add_handlers

from .commands import _get_build_dir, _get_config, _get_config_dir


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
    base_dir = os.path.realpath(os.path.join(HERE, '..'))
    dev_mode = os.path.exists(os.path.join(base_dir, '.git'))
    if dev_mode:
        nbapp.log.info(DEV_NOTE_NPM)

    web_app = nbapp.web_app

    # Handle page config data.
    config_dir = _get_config_dir()
    build_config = _get_config()
    page_config_file = os.path.join(config_dir, 'page_config_data.json')
    build_dir = _get_build_dir(build_config)

    # Check for dev mode.
    dev_mode = False
    if hasattr(nbapp, 'dev_mode'):
        dev_mode = nbapp.dev_mode

    if not os.path.exists(build_dir) or dev_mode:
        print('Serving local JupyterLab files')
        build_dir = os.path.join(HERE, 'build')

    add_handlers(
        web_app, page_config_file, build_dir, 'JupyterLab Alpha Preview',
        PREFIX
    )
