"""Server extension for JupyterLab."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

try:
    from ._version import __version__
except ImportError as e:
    # when we are python 3 only, add 'from e' at the end to chain the exception.
    raise ImportError("No module named 'jupyter._version'. Build the jupyterlab package to generate this module, for example, with `pip install -e /path/to/jupyterlab/repo`.")

from .labapp import LabApp, HERE, bootstrap_from_nbapp


def _jupyter_server_extension_paths():
    return [{
        "module": "jupyterlab"
    }]


def load_jupyter_server_extension(nbapp):
    if not isinstance(nbapp, LabApp):
        bootstrap_from_nbapp(nbapp)
    nbapp.log.info('JupyterLab alpha preview extension loaded from %s' % HERE)
