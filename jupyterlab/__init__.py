"""Server extension for JupyterLab."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from ._version import __version__                     # noqa
from .extension import load_jupyter_server_extension  # noqa
from .labapp import LabApp

def _jupyter_server_extension_paths():
    return [{'module': 'jupyterlab'}]

load_jupyter_server_extension = LabApp.load_jupyter_server_extension
