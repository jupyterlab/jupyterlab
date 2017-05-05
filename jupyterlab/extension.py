# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os

from jupyterlab_launcher import add_handlers, LabConfig

from .commands import _get_config_dir, _get_runtime_dir
from ._version import __version__

#-----------------------------------------------------------------------------
# Module globals
#-----------------------------------------------------------------------------

DEV_NOTE_NPM = """You're running JupyterLab from source.
If you're working on the TypeScript sources of JupyterLab, try running

    npm run watch

from the JupyterLab repo directory in another terminal window to have the
system incrementally watch and build JupyterLab's TypeScript for you, as you
make changes.
"""


CORE_NOTE = """
Running the core application with no additional extensions or settings
"""


def load_jupyter_server_extension(nbapp):
    """Load the JupyterLab server extension.
    """
    # Print messages.
    here = os.path.dirname(__file__)
    nbapp.log.info('JupyterLab alpha preview extension loaded from %s' % here)

    web_app = nbapp.web_app
    config = LabConfig()
    config.assets_dir = _get_runtime_dir()
    config.settings_dir = _get_config_dir()
    config.page_title = 'JupyterLab Alpha Preview'
    config.name = 'JupyterLab'
    config.page_url = '/lab'
    config.version = __version__

    # Check for dev dir.
    dev_dir = ''
    if hasattr(nbapp, 'dev_dir'):
        dev_dir = nbapp.dev_dir

    if dev_dir:
        nbapp.log.info(DEV_NOTE_NPM)
        config.assets_dir = os.path.join(here, 'build')
        config.settings_dir = ''
        config.dev_mode = True

        add_handlers(web_app, config)
        return

    # Check for explicit core mode.
    core_mode = False
    if hasattr(nbapp, 'core_mode'):
        core_mode = nbapp.core_mode

    # Run core mode if explicit or there is no settings directory.
    if core_mode or not os.path.exists(config.settings_dir):
        config.assets_dir = os.path.join(here, 'static', 'build')
        if not os.path.exists(config.assets_dir):
            msg = 'Static assets not built, please see CONTRIBUTING.md'
            nbapp.log.error(msg)
        else:
            nbapp.log.info(CORE_NOTE.strip())

    from PyQt5.QtCore import pyqtRemoveInputHook; pyqtRemoveInputHook()
    import ipdb; ipdb.set_trace()
    pass
    

    add_handlers(web_app, config)
