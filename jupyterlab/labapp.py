# coding: utf-8
"""A tornado based Jupyter lab server."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# TODO: import base server app
import os
from jupyter_core.paths import jupyter_config_path, jupyter_path
from notebook.notebookapp import NotebookApp
from traitlets import List, Dict, Unicode, default
from traitlets.config.manager import BaseJSONConfigManager

from .labextensions import find_labextension, validate_labextension_folder

from ._version import __version__


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

#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------

main = launch_new_instance = LabApp.launch_instance
