"""Server extension for JupyterLab."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from ._version import __version__
from .labapp import LabApp

def _jupyter_server_extension_points():
    return [
        {
            'module': 'jupyterlab',
            'app': LabApp
        }
    ]