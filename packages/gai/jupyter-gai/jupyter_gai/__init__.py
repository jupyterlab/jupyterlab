from ._version import __version__
from .extension import GaiExtension
from .engine import GPT3ModelEngine

def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "jupyter_gai"
    }]

def _jupyter_server_extension_points():
    return [{
        "module": "jupyter_gai",
        "app": GaiExtension
    }]
