"""Server extension for JupyterLab."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from .labapp import LabApp, HERE, bootstrap_from_nbapp


def _jupyter_server_extension_paths():
    return [{
        "module": "jupyterlab"
    }]


def load_jupyter_server_extension(nbapp):
    if not isinstance(nbapp, LabApp):
        bootstrap_from_nbapp(nbapp)
    nbapp.log.info('JupyterLab alpha preview extension loaded from %s' % HERE)
