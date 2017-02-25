"""Server extension for JupyterLab."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

try:
    from ._version import __version__
except ImportError as e:
    # when we are python 3 only, add 'from e' at the end to chain the exception.
    raise ImportError("No module named 'jupyterlab._version'. Build the jupyterlab package to generate this module, for example, with `pip install -e /path/to/jupyterlab/repo`.")

from .extension import load_jupyter_server_extension

def _jupyter_server_extension_paths():
    return [{
        "module": "jupyterlab"
    }]
